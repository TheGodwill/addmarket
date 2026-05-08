'use server'
import { revalidatePath } from 'next/cache'
import { and, eq, sql, desc, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  moderationReports,
  accountSanctions,
  profiles,
  auditLog,
  listings,
  sellerProfiles,
} from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import {
  sendModerationWarningEmail,
  sendModerationSuspensionEmail,
  sendModerationBanEmail,
} from '@/lib/email'

// ─── Helper ──────────────────────────────────────────────────────────────────

async function requireModerator() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'moderation.read')) return null
  return { user, role }
}

async function writeAudit(
  actorId: string,
  action: string,
  targetId: string,
  meta: Record<string, unknown>,
) {
  await db.insert(auditLog).values({
    actorId,
    action,
    targetType: 'moderation',
    targetId,
    metadata: meta,
  })
}

// ─── Submit report (any verified user) ───────────────────────────────────────

export async function submitReport(input: {
  targetType: 'listing' | 'seller' | 'review'
  targetId: string
  reason: 'spam' | 'fake' | 'inappropriate' | 'illegal' | 'scam' | 'other'
  details?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'content.report')) return { success: false, error: 'Accès refusé' }

  // Check verified membership
  const profileRows = await db
    .select({
      membershipStatus: profiles.membershipStatus,
      falseReportCount: profiles.falseReportCount,
      suspendedUntil: profiles.suspendedUntil,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)
  const profile = profileRows.at(0)
  if (profile?.membershipStatus !== 'verified') {
    return { success: false, error: 'Réservé aux membres vérifiés' }
  }
  // Anti-abuse: user with 10+ false reports is auto-suspended from reporting
  if ((profile.falseReportCount ?? 0) >= 10) {
    return { success: false, error: 'Votre accès au signalement est suspendu' }
  }

  // Cooldown: max 1 report per target per user
  const existing = await db
    .select({ id: moderationReports.id })
    .from(moderationReports)
    .where(
      and(
        eq(moderationReports.reporterId, user.id),
        eq(moderationReports.targetId, input.targetId),
        ne(moderationReports.status, 'rejected'),
      ),
    )
    .limit(1)
  if (existing.at(0)) return { success: false, error: 'Vous avez déjà signalé ce contenu' }

  await db.insert(moderationReports).values({
    reporterId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    ...(input.details?.trim() ? { details: input.details.trim() } : {}),
  })

  return { success: true }
}

// ─── Get reports list (moderator) ────────────────────────────────────────────

export async function getModerationReports(
  filter: 'all' | 'new' | 'in_review' | 'high',
  page: number,
) {
  const ctx = await requireModerator()
  if (!ctx) return null

  const limit = 20
  const offset = (page - 1) * limit

  const where =
    filter === 'new'
      ? eq(moderationReports.status, 'new')
      : filter === 'in_review'
        ? eq(moderationReports.status, 'in_review')
        : filter === 'high'
          ? eq(moderationReports.priority, 'high')
          : undefined

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: moderationReports.id,
        targetType: moderationReports.targetType,
        targetId: moderationReports.targetId,
        reason: moderationReports.reason,
        details: moderationReports.details,
        status: moderationReports.status,
        priority: moderationReports.priority,
        createdAt: moderationReports.createdAt,
        reporterName: profiles.displayName,
      })
      .from(moderationReports)
      .leftJoin(profiles, eq(moderationReports.reporterId, profiles.id))
      .where(where)
      .orderBy(
        sql`CASE WHEN ${moderationReports.priority} = 'high' THEN 0 ELSE 1 END`,
        desc(moderationReports.createdAt),
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(moderationReports)
      .where(where),
  ])

  return {
    reports: rows.map((r) => ({ ...r, reporterName: r.reporterName ?? 'Membre supprimé' })),
    total: countRow.at(0)?.count ?? 0,
    totalPages: Math.ceil((countRow.at(0)?.count ?? 0) / limit),
  }
}

// ─── Get single report detail ─────────────────────────────────────────────────

export async function getReportDetail(reportId: string) {
  const ctx = await requireModerator()
  if (!ctx) return null

  const rows = await db
    .select()
    .from(moderationReports)
    .where(eq(moderationReports.id, reportId))
    .limit(1)
  return rows.at(0) ?? null
}

// ─── Resolve / reject report ──────────────────────────────────────────────────

export async function resolveReport(
  reportId: string,
  action: 'resolve' | 'reject',
  note: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireModerator()
  if (!ctx) return { success: false, error: 'Accès refusé' }

  if (!note.trim()) return { success: false, error: 'Une note est requise' }

  const newStatus = action === 'resolve' ? 'resolved' : 'rejected'
  await db
    .update(moderationReports)
    .set({
      status: newStatus,
      moderatorNote: note.trim(),
      resolvedById: ctx.user.id,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(moderationReports.id, reportId))

  await writeAudit(ctx.user.id, `moderation.report.${action}`, reportId, { note: note.trim() })
  revalidatePath('/moderation/reports')
  return { success: true }
}

export async function startReview(reportId: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireModerator()
  if (!ctx) return { success: false, error: 'Accès refusé' }

  await db
    .update(moderationReports)
    .set({ status: 'in_review', updatedAt: new Date() })
    .where(eq(moderationReports.id, reportId))

  revalidatePath('/moderation/reports')
  return { success: true }
}

// ─── Mark report as abusive (false report) ───────────────────────────────────

export async function markReportAbusive(
  reportId: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireModerator()
  if (!ctx) return { success: false, error: 'Accès refusé' }

  const reportRows = await db
    .select({ reporterId: moderationReports.reporterId })
    .from(moderationReports)
    .where(eq(moderationReports.id, reportId))
    .limit(1)
  const report = reportRows.at(0)
  if (!report) return { success: false, error: 'Signalement introuvable' }

  await db
    .update(moderationReports)
    .set({
      status: 'rejected',
      moderatorNote: 'Signalement abusif',
      resolvedById: ctx.user.id,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(moderationReports.id, reportId))

  // Increment false_report_count for the reporter
  if (report.reporterId) {
    await db
      .update(profiles)
      .set({ falseReportCount: sql`${profiles.falseReportCount} + 1` })
      .where(eq(profiles.id, report.reporterId))

    // Auto-suspend from reporting if 10+ false reports (warning, not account suspension)
    const updated = await db
      .select({ falseReportCount: profiles.falseReportCount })
      .from(profiles)
      .where(eq(profiles.id, report.reporterId))
      .limit(1)
    const frc = updated.at(0)?.falseReportCount ?? 0
    if (frc >= 10) {
      await writeAudit(ctx.user.id, 'moderation.reporter.auto_suspended', report.reporterId, {
        falseReportCount: frc,
      })
    }
  }

  await writeAudit(ctx.user.id, 'moderation.report.abusive', reportId, {})
  revalidatePath('/moderation/reports')
  return { success: true }
}

// ─── Account sanctions ────────────────────────────────────────────────────────

async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(userId)
  return data.user?.email ?? null
}

async function getUserDisplayName(userId: string): Promise<string> {
  const rows = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)
  return rows.at(0)?.displayName ?? 'Membre'
}

export async function warnUser(
  userId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireModerator()
  if (!ctx) return { success: false, error: 'Accès refusé' }
  if (!can(ctx.role, 'moderation.action')) return { success: false, error: 'Accès refusé' }
  if (!reason.trim()) return { success: false, error: 'Motif requis' }

  await db
    .insert(accountSanctions)
    .values({ userId, sanctionedById: ctx.user.id, type: 'warning', reason: reason.trim() })
  await db
    .update(profiles)
    .set({ warningCount: sql`${profiles.warningCount} + 1` })
    .where(eq(profiles.id, userId))
  await writeAudit(ctx.user.id, 'moderation.user.warn', userId, { reason: reason.trim() })

  const [email, name] = await Promise.all([getUserEmail(userId), getUserDisplayName(userId)])
  if (email) void sendModerationWarningEmail(email, name, reason.trim())

  revalidatePath('/moderation/reports')
  return { success: true }
}

export async function suspendUser(
  userId: string,
  reason: string,
  durationDays: number,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireModerator()
  if (!ctx) return { success: false, error: 'Accès refusé' }
  if (!can(ctx.role, 'moderation.action')) return { success: false, error: 'Accès refusé' }
  if (!reason.trim() || durationDays < 1) return { success: false, error: 'Motif et durée requis' }

  const until = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
  await db.update(profiles).set({ suspendedUntil: until }).where(eq(profiles.id, userId))
  await db.insert(accountSanctions).values({
    userId,
    sanctionedById: ctx.user.id,
    type: 'suspension',
    reason: reason.trim(),
    expiresAt: until,
  })
  await writeAudit(ctx.user.id, 'moderation.user.suspend', userId, {
    reason: reason.trim(),
    durationDays,
    until,
  })

  const [email, name] = await Promise.all([getUserEmail(userId), getUserDisplayName(userId)])
  if (email) void sendModerationSuspensionEmail(email, name, reason.trim(), until)

  revalidatePath('/moderation/reports')
  return { success: true }
}

export async function banUser(
  userId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireModerator()
  if (!ctx) return { success: false, error: 'Accès refusé' }
  if (!can(ctx.role, 'moderation.action.ban'))
    return { success: false, error: 'Action réservée aux admins' }
  if (!reason.trim()) return { success: false, error: 'Motif requis' }

  await db.update(profiles).set({ bannedAt: new Date() }).where(eq(profiles.id, userId))
  await db.insert(accountSanctions).values({
    userId,
    sanctionedById: ctx.user.id,
    type: 'ban',
    reason: reason.trim(),
  })
  await writeAudit(ctx.user.id, 'moderation.user.ban', userId, { reason: reason.trim() })

  const [email, name] = await Promise.all([getUserEmail(userId), getUserDisplayName(userId)])
  if (email) void sendModerationBanEmail(email, name, reason.trim())

  revalidatePath('/moderation/reports')
  return { success: true }
}

// ─── Moderation queue data ────────────────────────────────────────────────────

export async function getModerationQueue() {
  const ctx = await requireModerator()
  if (!ctx) return null

  // New listings published in last 48h
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const [newListings, newSellers] = await Promise.all([
    db
      .select({
        id: listings.id,
        title: listings.title,
        createdAt: listings.createdAt,
        sellerId: listings.sellerId,
      })
      .from(listings)
      .where(and(eq(listings.status, 'active'), sql`${listings.createdAt} > ${since48h}`))
      .orderBy(desc(listings.createdAt))
      .limit(20),
    db
      .select({
        id: sellerProfiles.id,
        businessName: sellerProfiles.businessName,
        slug: sellerProfiles.slug,
        createdAt: sellerProfiles.createdAt,
      })
      .from(sellerProfiles)
      .where(and(eq(sellerProfiles.isActive, true), sql`${sellerProfiles.createdAt} > ${since48h}`))
      .orderBy(desc(sellerProfiles.createdAt))
      .limit(20),
  ])

  return { newListings, newSellers }
}

// ─── Moderation stats (admin_national only) ───────────────────────────────────

export async function getModerationStats() {
  const ctx = await requireModerator()
  if (!ctx) return null

  const [totalRow, newRow, resolvedRow, avgDuration] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(moderationReports),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(moderationReports)
      .where(eq(moderationReports.status, 'new')),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(moderationReports)
      .where(eq(moderationReports.status, 'resolved')),
    db
      .select({
        avg: sql<number>`EXTRACT(EPOCH FROM AVG(resolved_at - created_at)) / 3600`,
      })
      .from(moderationReports)
      .where(
        and(
          eq(moderationReports.status, 'resolved'),
          sql`${moderationReports.resolvedAt} IS NOT NULL`,
        ),
      ),
  ])

  return {
    total: totalRow.at(0)?.count ?? 0,
    pending: newRow.at(0)?.count ?? 0,
    resolved: resolvedRow.at(0)?.count ?? 0,
    avgResolutionHours: Math.round(avgDuration.at(0)?.avg ?? 0),
  }
}
