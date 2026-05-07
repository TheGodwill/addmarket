'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateRecoveryCodes, hashRecoveryCode } from '@/lib/mfa'
import { sendMfaDisabledEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { db } from '@/db/client'
import { auditLog, mfaRecoveryCodes, profiles } from '@/db/schema'

type ActionResult = { error: string } | { success: string }
type EnrollResult =
  | { error: string }
  | { factorId: string; qrCode: string; secret: string; uri: string }
type CompleteResult = { error: string } | { codes: string[] }

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

// ─── Enrollment ─────────────────────────────────────────────────────────────

export async function startMfaEnrollment(): Promise<EnrollResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  // Unenroll any existing unverified factor first (use .all which includes unverified)
  const { data: existing } = await supabase.auth.mfa.listFactors()
  for (const factor of existing?.all ?? []) {
    if (factor.factor_type === 'totp' && factor.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'ADDMarket',
    friendlyName: user.email ?? 'ADDMarket',
  })

  if (error || !data) {
    logger.warn({ userId: user.id }, `[mfa] enroll error: ${error?.message}`)
    return { error: "Impossible d'initialiser la MFA. Réessayez." }
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

const verifyCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code invalide — 6 chiffres attendus'),
})

export async function completeMfaEnrollment(
  factorId: string,
  code: string,
): Promise<CompleteResult> {
  const parsed = verifyCodeSchema.safeParse({ code })
  if (!parsed.success) return { error: 'Code invalide' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  // Challenge + verify in one step
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeErr || !challenge) return { error: 'Échec défi MFA. Réessayez.' }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (verifyErr) return { error: 'Code incorrect. Vérifiez votre application.' }

  // Generate and store recovery codes
  const plainCodes = generateRecoveryCodes(8)

  // Delete old codes (if re-enrolling)
  await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id))

  // Insert hashed codes
  const hashed = await Promise.all(plainCodes.map(hashRecoveryCode))
  await db
    .insert(mfaRecoveryCodes)
    .values(hashed.map((codeHash) => ({ userId: user.id, codeHash })))

  // Update profile
  await db
    .update(profiles)
    .set({ mfaEnabledAt: new Date(), mfaFactorId: factorId })
    .where(eq(profiles.id, user.id))

  await writeAudit('mfa.enabled', user.id, {})
  return { codes: plainCodes }
}

// ─── Disable MFA ────────────────────────────────────────────────────────────

const disableSchema = z.object({
  password: z.string().min(1, 'Mot de passe requis'),
})

export async function disableMfa(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = disableSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }

  const { password } = parsed.data
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Session expirée. Reconnectez-vous.' }

  // Re-authenticate with password
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (authErr) return { error: 'Mot de passe incorrect.' }

  // Unenroll all TOTP factors via admin API
  const adminClient = createAdminClient()
  const { data: factorsData } = await adminClient.auth.admin.mfa.listFactors({ userId: user.id })
  const totpFactors = factorsData?.factors?.filter((f) => f.factor_type === 'totp') ?? []
  for (const factor of totpFactors) {
    await adminClient.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id })
  }

  // Delete recovery codes
  await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id))

  // Clear profile MFA fields
  await db
    .update(profiles)
    .set({ mfaEnabledAt: null, mfaFactorId: null })
    .where(eq(profiles.id, user.id))

  // Notify by email (security alert)
  sendMfaDisabledEmail(user.email).catch(() => undefined)

  await writeAudit('mfa.disabled', user.id, {})
  return { success: 'MFA désactivée. Pensez à la réactiver pour sécuriser votre compte.' }
}

// ─── MFA Status ─────────────────────────────────────────────────────────────

export async function getMfaStatus(): Promise<{
  enabled: boolean
  enabledAt: Date | null
  recoveryCodesRemaining: number
}> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { enabled: false, enabledAt: null, recoveryCodesRemaining: 0 }

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const enabled = (factors?.totp?.length ?? 0) > 0

  const profile = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  const enabledAt = profile[0]?.mfaEnabledAt ?? null

  const codes = await db.select().from(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id))

  const remaining = codes.filter((c) => !c.usedAt).length

  return { enabled, enabledAt, recoveryCodesRemaining: remaining }
}
