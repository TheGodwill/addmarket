'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyRecoveryCode } from '@/lib/mfa'
import { logger } from '@/lib/logger'
import { db } from '@/db/client'
import { auditLog, mfaRecoveryCodes, profiles } from '@/db/schema'

type ActionResult = { error: string } | { success: string }

async function getIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
}

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

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code invalide — 6 chiffres attendus'),
})

export async function verifyMfaChallenge(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await getIp()

  const { success: rateLimitOk } = await checkRateLimit('mfa', ip)
  if (!rateLimitOk) {
    return { error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
  }

  const parsed = codeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Code invalide' }
  }

  const { code } = parsed.data
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  // List enrolled factors to find TOTP factor
  const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors()
  if (listErr || !factors?.totp?.length) {
    return { error: 'Aucun facteur MFA trouvé.' }
  }

  const factor = factors.totp[0]
  if (!factor) return { error: 'Aucun facteur MFA trouvé.' }

  // Create challenge
  const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
  })
  if (challengeErr || !challengeData) {
    logger.warn({ userId: user.id }, '[mfa] Échec création challenge')
    return { error: 'Impossible de créer le défi MFA. Réessayez.' }
  }

  // Verify code
  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challengeData.id,
    code,
  })

  if (verifyErr) {
    await writeAudit('mfa.challenge_failed', user.id, {})
    return { error: 'Code incorrect. Réessayez.' }
  }

  await writeAudit('mfa.challenge_success', user.id, {})
  redirect('/')
}

const recoverySchema = z.object({
  code: z
    .string()
    .min(10, 'Code de récupération invalide')
    .max(12, 'Code de récupération invalide'),
})

export async function useRecoveryCodeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await getIp()

  // Strict rate limit: 5 attempts per IP
  const { success: rateLimitOk } = await checkRateLimit('recovery', ip)
  if (!rateLimitOk) {
    return { error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
  }

  const parsed = recoverySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: 'Code de récupération invalide.' }
  }

  const { code } = parsed.data
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  // Fetch all unused recovery codes for this user
  const storedCodes = await db
    .select()
    .from(mfaRecoveryCodes)
    .where(and(eq(mfaRecoveryCodes.userId, user.id), isNull(mfaRecoveryCodes.usedAt)))

  // Verify code against each stored hash
  let matchedId: string | null = null
  for (const stored of storedCodes) {
    const ok = await verifyRecoveryCode(code, stored.codeHash)
    if (ok) {
      matchedId = stored.id
      break
    }
  }

  if (!matchedId) {
    await writeAudit('mfa.recovery_failed', user.id, {})
    return { error: 'Code de récupération invalide ou déjà utilisé.' }
  }

  // Mark code as used
  await db
    .update(mfaRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(eq(mfaRecoveryCodes.id, matchedId))

  await writeAudit('mfa.recovery_code_used', user.id, {})

  // Disable the MFA factor via admin API so user has no pending challenge
  const adminClient = createAdminClient()
  const { data: factorsData } = await adminClient.auth.admin.mfa.listFactors({ userId: user.id })
  for (const factor of factorsData?.factors ?? []) {
    await adminClient.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id })
  }

  // Clear profile MFA fields
  await db
    .update(profiles)
    .set({ mfaEnabledAt: null, mfaFactorId: null })
    .where(eq(profiles.id, user.id))

  await writeAudit('mfa.disabled_via_recovery', user.id, {})

  redirect('/account/security?notice=mfa_reset')
}
