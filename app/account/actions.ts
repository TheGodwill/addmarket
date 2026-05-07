'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generateRecoveryCodes, hashRecoveryCode } from '@/lib/mfa'
import { sendMfaDisabledEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { db } from '@/db/client'
import { auditLog, mfaRecoveryCodes, profiles } from '@/db/schema'

type ActionResult = { error: string } | { success: string }
type EnableResult = { error: string } | { codes: string[] }

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

// ─── Enable email OTP MFA ────────────────────────────────────────────────────

export async function enableEmailOtp(): Promise<EnableResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  // Generate and store 8 recovery codes
  const plainCodes = generateRecoveryCodes(8)

  await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id))

  const hashed = await Promise.all(plainCodes.map(hashRecoveryCode))
  await db
    .insert(mfaRecoveryCodes)
    .values(hashed.map((codeHash) => ({ userId: user.id, codeHash })))

  await db.update(profiles).set({ mfaEnabledAt: new Date() }).where(eq(profiles.id, user.id))

  await writeAudit('mfa.enabled', user.id, {})
  return { codes: plainCodes }
}

// ─── Disable email OTP MFA ───────────────────────────────────────────────────

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

  // Clear MFA data
  await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id))
  await db
    .update(profiles)
    .set({ mfaEnabledAt: null, mfaFactorId: null })
    .where(eq(profiles.id, user.id))

  // Security alert email
  sendMfaDisabledEmail(user.email).catch(() => undefined)

  await writeAudit('mfa.disabled', user.id, {})
  return { success: 'MFA désactivée. Pensez à la réactiver pour sécuriser votre compte.' }
}

// ─── MFA status ──────────────────────────────────────────────────────────────

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

  const profile = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  const enabledAt = profile[0]?.mfaEnabledAt ?? null
  const enabled = enabledAt !== null

  const codes = await db.select().from(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id))

  return { enabled, enabledAt, recoveryCodesRemaining: codes.filter((c) => !c.usedAt).length }
}
