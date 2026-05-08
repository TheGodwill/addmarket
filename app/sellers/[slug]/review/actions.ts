'use server'
import { revalidatePath } from 'next/cache'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { sellerProfiles, sellerReviews, profiles, auditLog } from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/rate-limit'
import { getAutoStatus } from '@/lib/moderation'
import { sendNewReviewEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'

const reviewSchema = z.object({
  sellerId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  listingId: z.string().uuid().optional(),
})

export type ReviewInput = z.input<typeof reviewSchema>

export async function submitReview(
  input: ReviewInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'review.create')) return { success: false, error: 'Accès refusé' }

  // Rate limit: 5 reviews per day per user
  const rl = await checkRateLimit('reviewCreate', user.id)
  if (!rl.success) return { success: false, error: 'Limite atteinte — réessayez demain' }

  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Données invalides' }
  const { sellerId, rating, comment, listingId } = parsed.data

  // Must be a verified member
  const profileRows = await db
    .select({ membershipStatus: profiles.membershipStatus })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)
  const profile = profileRows.at(0)
  if (profile?.membershipStatus !== 'verified') {
    return { success: false, error: 'Réservé aux membres vérifiés' }
  }

  // Cannot review your own seller profile
  const sellerRows = await db
    .select({
      userId: sellerProfiles.userId,
      slug: sellerProfiles.slug,
      businessName: sellerProfiles.businessName,
      contactEmail: sellerProfiles.contactEmail,
    })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.id, sellerId))
    .limit(1)
  const seller = sellerRows.at(0)
  if (!seller) return { success: false, error: 'Vendeur introuvable' }
  if (seller.userId === user.id)
    return { success: false, error: 'Vous ne pouvez pas vous auto-évaluer' }

  // Check 30-day cooldown for edits (existing review)
  const existing = await db
    .select({ id: sellerReviews.id, updatedAt: sellerReviews.updatedAt })
    .from(sellerReviews)
    .where(and(eq(sellerReviews.reviewerId, user.id), eq(sellerReviews.sellerId, sellerId)))
    .limit(1)

  const existingReview = existing.at(0)
  if (existingReview) {
    const cooldownEnd = new Date(existingReview.updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    if (new Date() < cooldownEnd) {
      return {
        success: false,
        error: `Modification possible après ${cooldownEnd.toLocaleDateString('fr-FR')}`,
      }
    }
    // Update existing review
    const autoStatus = getAutoStatus(comment ?? null)
    await db
      .update(sellerReviews)
      .set({
        rating,
        ...(comment !== undefined ? { comment } : {}),
        ...(listingId !== undefined ? { listingId } : {}),
        status: autoStatus,
        updatedAt: new Date(),
      })
      .where(eq(sellerReviews.id, existingReview.id))
    await db.insert(auditLog).values({
      actorId: user.id,
      action: 'review.update',
      targetType: 'review',
      targetId: existingReview.id,
      metadata: { sellerId, rating, autoStatus },
    })
    revalidatePath(`/sellers/${seller.slug}`)
    revalidatePath(`/sellers/${seller.slug}/reviews`)
    return { success: true }
  }

  // New review
  const autoStatus = getAutoStatus(comment ?? null)
  const [inserted] = await db
    .insert(sellerReviews)
    .values({
      sellerId,
      reviewerId: user.id,
      rating,
      ...(comment !== undefined ? { comment } : {}),
      ...(listingId !== undefined ? { listingId } : {}),
      status: autoStatus,
      isVerified: true,
    })
    .returning({ id: sellerReviews.id })
  if (inserted) {
    await db.insert(auditLog).values({
      actorId: user.id,
      action: 'review.create',
      targetType: 'review',
      targetId: inserted.id,
      metadata: { sellerId, rating, autoStatus },
    })
  }

  // Notify seller by email (fire-and-forget)
  if (seller.contactEmail && seller.slug) {
    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.auth.admin.getUserById(user.id)
    const reviewerName =
      (userData.user?.user_metadata?.display_name as string | undefined) ?? 'Un membre'
    void sendNewReviewEmail(
      seller.contactEmail,
      seller.businessName,
      reviewerName,
      rating,
      seller.slug,
    )
  }

  revalidatePath(`/sellers/${seller.slug}`)
  revalidatePath(`/sellers/${seller.slug}/reviews`)
  return { success: true }
}

export async function getExistingReview(sellerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const rows = await db
    .select()
    .from(sellerReviews)
    .where(and(eq(sellerReviews.reviewerId, user.id), eq(sellerReviews.sellerId, sellerId)))
    .limit(1)
  return rows.at(0) ?? null
}

export async function getReviewStats(sellerId: string) {
  const rows = await db
    .select({ rating: sellerReviews.rating })
    .from(sellerReviews)
    .where(and(eq(sellerReviews.sellerId, sellerId), eq(sellerReviews.status, 'published')))

  const total = rows.length
  if (total === 0) return { total: 0, avg: 0, distribution: [0, 0, 0, 0, 0] }

  const avg = rows.reduce((s, r) => s + r.rating, 0) / total
  const distribution = [1, 2, 3, 4, 5].map((star) => rows.filter((r) => r.rating === star).length)
  return { total, avg, distribution }
}

export async function getPaginatedReviews(sellerId: string, page: number) {
  const limit = 10
  const offset = (page - 1) * limit

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: sellerReviews.id,
        rating: sellerReviews.rating,
        comment: sellerReviews.comment,
        response: sellerReviews.response,
        responseUpdatedAt: sellerReviews.responseUpdatedAt,
        isVerified: sellerReviews.isVerified,
        createdAt: sellerReviews.createdAt,
        reviewerName: profiles.displayName,
      })
      .from(sellerReviews)
      .leftJoin(profiles, eq(sellerReviews.reviewerId, profiles.id))
      .where(and(eq(sellerReviews.sellerId, sellerId), eq(sellerReviews.status, 'published')))
      .orderBy(sql`${sellerReviews.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sellerReviews)
      .where(and(eq(sellerReviews.sellerId, sellerId), eq(sellerReviews.status, 'published'))),
  ])

  return {
    reviews: rows.map((r) => ({ ...r, reviewerName: r.reviewerName ?? 'Membre supprimé' })),
    total: countRow.at(0)?.count ?? 0,
    page,
    totalPages: Math.ceil((countRow.at(0)?.count ?? 0) / limit),
  }
}
