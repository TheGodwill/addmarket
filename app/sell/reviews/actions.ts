'use server'
import { revalidatePath } from 'next/cache'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { sellerReviews, sellerProfiles, profiles, auditLog } from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import { sendReviewResponseEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'

async function getSellerIdForUser(userId: string): Promise<string | null> {
  const rows = await db
    .select({ id: sellerProfiles.id })
    .from(sellerProfiles)
    .where(and(eq(sellerProfiles.userId, userId), eq(sellerProfiles.isActive, true)))
    .limit(1)
  return rows.at(0)?.id ?? null
}

export async function respondToReview(
  reviewId: string,
  response: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'review.respond.own_seller')) return { success: false, error: 'Accès refusé' }

  const trimmed = response.trim()
  if (!trimmed || trimmed.length > 1000)
    return { success: false, error: 'Réponse invalide (1-1000 caractères)' }

  const sellerId = await getSellerIdForUser(user.id)
  if (!sellerId) return { success: false, error: 'Profil vendeur introuvable' }

  // Verify review belongs to this seller
  const reviewRows = await db
    .select({
      id: sellerReviews.id,
      reviewerId: sellerReviews.reviewerId,
      response: sellerReviews.response,
    })
    .from(sellerReviews)
    .where(and(eq(sellerReviews.id, reviewId), eq(sellerReviews.sellerId, sellerId)))
    .limit(1)
  const review = reviewRows.at(0)
  if (!review) return { success: false, error: 'Avis introuvable' }

  await db
    .update(sellerReviews)
    .set({ response: trimmed, responseUpdatedAt: new Date() })
    .where(eq(sellerReviews.id, reviewId))

  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'review.respond',
    targetType: 'review',
    targetId: reviewId,
    metadata: { sellerId },
  })

  // Notify reviewer if they have an account (fire-and-forget)
  if (review.reviewerId) {
    const sellerProfileRows = await db
      .select({
        businessName: sellerProfiles.businessName,
        slug: sellerProfiles.slug,
        contactEmail: sellerProfiles.contactEmail,
      })
      .from(sellerProfiles)
      .where(eq(sellerProfiles.id, sellerId))
      .limit(1)
    const sellerProfile = sellerProfileRows.at(0)

    const reviewerProfileRows = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, review.reviewerId))
      .limit(1)
    const reviewerProfile = reviewerProfileRows.at(0)

    if (sellerProfile?.slug && reviewerProfile) {
      const adminClient = createAdminClient()
      const { data: reviewerAuth } = await adminClient.auth.admin.getUserById(review.reviewerId)
      const reviewerEmail = reviewerAuth.user?.email
      if (reviewerEmail) {
        void sendReviewResponseEmail(
          reviewerEmail,
          reviewerProfile.displayName,
          sellerProfile.businessName,
          sellerProfile.slug,
        )
      }
    }
  }

  revalidatePath('/sell/reviews')
  return { success: true }
}

export async function reportReview(
  reviewId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'review.report')) return { success: false, error: 'Accès refusé' }

  const trimmed = reason.trim()
  if (!trimmed || trimmed.length > 500)
    return { success: false, error: 'Motif invalide (1-500 caractères)' }

  const sellerId = await getSellerIdForUser(user.id)
  if (!sellerId) return { success: false, error: 'Profil vendeur introuvable' }

  await db
    .update(sellerReviews)
    .set({ reportReason: trimmed })
    .where(and(eq(sellerReviews.id, reviewId), eq(sellerReviews.sellerId, sellerId)))

  revalidatePath('/sell/reviews')
  return { success: true }
}

export async function getSellerReviews(page: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const sellerId = await getSellerIdForUser(user.id)
  if (!sellerId) return null

  const limit = 15
  const offset = (page - 1) * limit

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: sellerReviews.id,
        rating: sellerReviews.rating,
        comment: sellerReviews.comment,
        response: sellerReviews.response,
        responseUpdatedAt: sellerReviews.responseUpdatedAt,
        status: sellerReviews.status,
        reportReason: sellerReviews.reportReason,
        isVerified: sellerReviews.isVerified,
        createdAt: sellerReviews.createdAt,
        reviewerName: profiles.displayName,
        reviewerId: sellerReviews.reviewerId,
      })
      .from(sellerReviews)
      .leftJoin(profiles, eq(sellerReviews.reviewerId, profiles.id))
      .where(eq(sellerReviews.sellerId, sellerId))
      .orderBy(sql`${sellerReviews.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sellerReviews)
      .where(eq(sellerReviews.sellerId, sellerId)),
  ])

  return {
    reviews: rows.map((r) => ({ ...r, reviewerName: r.reviewerName ?? 'Membre supprimé' })),
    total: countRow.at(0)?.count ?? 0,
    totalPages: Math.ceil((countRow.at(0)?.count ?? 0) / limit),
  }
}
