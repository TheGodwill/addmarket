'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { deletePhotos } from '@/lib/storage'
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { db } from '@/db/client'
import {
  REJECTION_REASON_CODES,
  REJECTION_REASON_LABELS,
  auditLog,
  churchReferents,
  profiles,
  verificationRequests,
} from '@/db/schema'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { error: string } | { success: string }

async function writeAudit(
  action: string,
  actorId: string | null,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
    const ua = h.get('user-agent') ?? 'unknown'
    await db
      .insert(auditLog)
      .values({ action, actorId, metadata: meta, ipAddress: ip, userAgent: ua })
  } catch (err) {
    logger.error({ err, action }, '[audit] Échec écriture audit_log')
  }
}

async function getReferentChurchId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ churchId: churchReferents.churchId })
    .from(churchReferents)
    .where(eq(churchReferents.userId, userId))
    .limit(1)
  return rows[0]?.churchId ?? null
}

async function getMemberEmail(memberId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const {
      data: { user },
    } = await admin.auth.admin.getUserById(memberId)
    return user?.email ?? null
  } catch {
    return null
  }
}

const approveSchema = z.object({
  request_id: z.string().uuid(),
})

export async function approveVerification(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée.' }

  const { success: ok } = await checkRateLimit('referentAction', user.id)
  if (!ok) return { error: "Trop d'actions. Réessayez dans une heure." }

  const parsed = approveSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Paramètres invalides.' }
  const { request_id } = parsed.data

  const churchId = await getReferentChurchId(user.id)
  if (!churchId) return { error: "Accès refusé : vous n'êtes pas référent." }

  const req = await db
    .select()
    .from(verificationRequests)
    .where(
      and(eq(verificationRequests.id, request_id), eq(verificationRequests.churchId, churchId)),
    )
    .limit(1)

  if (!req[0]) return { error: 'Demande introuvable.' }
  if (req[0].status !== 'pending' && req[0].status !== 'waiting') {
    return { error: 'Cette demande ne peut plus être approuvée.' }
  }
  if (req[0].userId === user.id) {
    return { error: 'Vous ne pouvez pas approuver votre propre demande.' }
  }

  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  await db
    .update(verificationRequests)
    .set({ status: 'approved', processedAt: new Date(), processedBy: user.id })
    .where(eq(verificationRequests.id, request_id))

  await db
    .update(profiles)
    .set({
      membershipStatus: 'verified',
      membershipCardHash: req[0].cardNumberHash,
      verifiedAt: new Date(),
      verifiedBy: user.id,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, req[0].userId))

  // Delete card photos immediately (GDPR)
  deletePhotos([req[0].cardPhotoStoragePath, req[0].cardPhotoBackStoragePath]).catch(
    () => undefined,
  )

  await writeAudit('verification.approved', user.id, {
    requestId: request_id,
    memberId: req[0].userId,
  })

  const email = await getMemberEmail(req[0].userId)
  if (email && req[0].submissionDisplayName) {
    sendVerificationApprovedEmail(email, req[0].submissionDisplayName, expiresAt).catch(
      () => undefined,
    )
  }

  return { success: 'Demande approuvée. Le membre est maintenant vérifié.' }
}

const rejectSchema = z.object({
  request_id: z.string().uuid(),
  reason_code: z.enum(REJECTION_REASON_CODES),
  reason_free: z.string().max(500).optional(),
})

export async function rejectVerification(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée.' }

  const { success: ok } = await checkRateLimit('referentAction', user.id)
  if (!ok) return { error: "Trop d'actions. Réessayez dans une heure." }

  const parsed = rejectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides.' }
  }
  const { request_id, reason_code, reason_free } = parsed.data

  const churchId = await getReferentChurchId(user.id)
  if (!churchId) return { error: "Accès refusé : vous n'êtes pas référent." }

  const req = await db
    .select()
    .from(verificationRequests)
    .where(
      and(eq(verificationRequests.id, request_id), eq(verificationRequests.churchId, churchId)),
    )
    .limit(1)

  if (!req[0]) return { error: 'Demande introuvable.' }
  if (req[0].status !== 'pending' && req[0].status !== 'waiting') {
    return { error: 'Cette demande ne peut plus être rejetée.' }
  }
  if (req[0].userId === user.id) {
    return { error: 'Vous ne pouvez pas rejeter votre propre demande.' }
  }

  const resubmitAfter = new Date(Date.now() + 24 * 3_600_000)

  await db
    .update(verificationRequests)
    .set({
      status: 'rejected',
      processedAt: new Date(),
      processedBy: user.id,
      rejectionReasonCode: reason_code,
      rejectionReason: reason_free ?? null,
      resubmitAfter,
    })
    .where(eq(verificationRequests.id, request_id))

  await db
    .update(profiles)
    .set({ membershipStatus: 'rejected', updatedAt: new Date() })
    .where(eq(profiles.id, req[0].userId))

  // Delete photos on rejection too (GDPR)
  deletePhotos([req[0].cardPhotoStoragePath, req[0].cardPhotoBackStoragePath]).catch(
    () => undefined,
  )

  await writeAudit('verification.rejected', user.id, {
    requestId: request_id,
    memberId: req[0].userId,
    reasonCode: reason_code,
  })

  const email = await getMemberEmail(req[0].userId)
  if (email && req[0].submissionDisplayName) {
    const reasonLabel = REJECTION_REASON_LABELS[reason_code]
    sendVerificationRejectedEmail(
      email,
      req[0].submissionDisplayName,
      reasonLabel,
      reason_free ?? null,
    ).catch(() => undefined)
  }

  return { success: 'Demande rejetée. Le membre a été notifié.' }
}

const holdSchema = z.object({
  request_id: z.string().uuid(),
})

export async function holdVerification(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée.' }

  const { success: ok } = await checkRateLimit('referentAction', user.id)
  if (!ok) return { error: "Trop d'actions. Réessayez dans une heure." }

  const parsed = holdSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Paramètres invalides.' }
  const { request_id } = parsed.data

  const churchId = await getReferentChurchId(user.id)
  if (!churchId) return { error: "Accès refusé : vous n'êtes pas référent." }

  const req = await db
    .select({
      id: verificationRequests.id,
      status: verificationRequests.status,
      churchId: verificationRequests.churchId,
    })
    .from(verificationRequests)
    .where(
      and(eq(verificationRequests.id, request_id), eq(verificationRequests.churchId, churchId)),
    )
    .limit(1)

  if (!req[0]) return { error: 'Demande introuvable.' }
  if (req[0].status !== 'pending') {
    return { error: 'Cette demande ne peut pas être mise en attente.' }
  }

  await db
    .update(verificationRequests)
    .set({ status: 'waiting', processedAt: new Date(), processedBy: user.id })
    .where(eq(verificationRequests.id, request_id))

  await writeAudit('verification.held', user.id, { requestId: request_id })

  return { success: 'Demande mise en attente.' }
}
