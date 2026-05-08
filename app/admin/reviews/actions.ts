'use server'
import { revalidatePath } from 'next/cache'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { sellerReviews, auditLog, profiles, sellerProfiles } from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'

async function requireModerator() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'review.moderate')) return null
  return user
}

async function writeAuditLog(
  actorId: string,
  action: string,
  targetId: string,
  metadata: Record<string, unknown>,
) {
  await db.insert(auditLog).values({ actorId, action, targetType: 'review', targetId, metadata })
}

export async function hideReview(
  reviewId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireModerator()
  if (!user) return { success: false, error: 'Accès refusé' }

  const trimmed = reason.trim()
  if (!trimmed) return { success: false, error: 'Un motif est requis' }

  const rows = await db
    .select({ status: sellerReviews.status })
    .from(sellerReviews)
    .where(eq(sellerReviews.id, reviewId))
    .limit(1)
  const review = rows.at(0)
  if (!review) return { success: false, error: 'Avis introuvable' }

  await db
    .update(sellerReviews)
    .set({ status: 'hidden', updatedAt: new Date() })
    .where(eq(sellerReviews.id, reviewId))

  await writeAuditLog(user.id, 'review.hide', reviewId, {
    before: review.status,
    after: 'hidden',
    reason: trimmed,
  })

  revalidatePath('/admin/reviews')
  return { success: true }
}

export async function publishReview(
  reviewId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireModerator()
  if (!user) return { success: false, error: 'Accès refusé' }

  const rows = await db
    .select({ status: sellerReviews.status })
    .from(sellerReviews)
    .where(eq(sellerReviews.id, reviewId))
    .limit(1)
  const review = rows.at(0)
  if (!review) return { success: false, error: 'Avis introuvable' }

  await db
    .update(sellerReviews)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(sellerReviews.id, reviewId))

  await writeAuditLog(user.id, 'review.publish', reviewId, {
    before: review.status,
    after: 'published',
  })

  revalidatePath('/admin/reviews')
  return { success: true }
}

export async function deleteReview(
  reviewId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireModerator()
  if (!user) return { success: false, error: 'Accès refusé' }

  const trimmed = reason.trim()
  if (!trimmed) return { success: false, error: 'Un motif est requis' }

  const rows = await db
    .select({ status: sellerReviews.status, rating: sellerReviews.rating })
    .from(sellerReviews)
    .where(eq(sellerReviews.id, reviewId))
    .limit(1)
  const review = rows.at(0)
  if (!review) return { success: false, error: 'Avis introuvable' }

  // Audit before deleting so the record survives
  await writeAuditLog(user.id, 'review.delete', reviewId, {
    before: review.status,
    rating: review.rating,
    reason: trimmed,
  })

  await db.delete(sellerReviews).where(eq(sellerReviews.id, reviewId))

  revalidatePath('/admin/reviews')
  return { success: true }
}

export async function getAdminReviews(filter: 'all' | 'pending' | 'reported', page: number) {
  const limit = 20
  const offset = (page - 1) * limit

  const where =
    filter === 'pending'
      ? eq(sellerReviews.status, 'pending')
      : filter === 'reported'
        ? sql`${sellerReviews.reportReason} IS NOT NULL`
        : undefined

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: sellerReviews.id,
        rating: sellerReviews.rating,
        comment: sellerReviews.comment,
        status: sellerReviews.status,
        reportReason: sellerReviews.reportReason,
        isVerified: sellerReviews.isVerified,
        createdAt: sellerReviews.createdAt,
        reviewerName: profiles.displayName,
        sellerName: sellerProfiles.businessName,
        sellerSlug: sellerProfiles.slug,
      })
      .from(sellerReviews)
      .leftJoin(profiles, eq(sellerReviews.reviewerId, profiles.id))
      .leftJoin(sellerProfiles, eq(sellerReviews.sellerId, sellerProfiles.id))
      .where(where)
      .orderBy(sql`${sellerReviews.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sellerReviews)
      .where(where),
  ])

  return {
    reviews: rows.map((r) => ({
      ...r,
      reviewerName: r.reviewerName ?? 'Membre supprimé',
      sellerName: r.sellerName ?? '—',
    })),
    total: countRow.at(0)?.count ?? 0,
    totalPages: Math.ceil((countRow.at(0)?.count ?? 0) / limit),
  }
}
