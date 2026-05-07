'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { validatePassword, isPasswordBreached } from '@/lib/password'
import { sendNewDeviceEmail, sendMfaOtpEmail } from '@/lib/email'
import { generateOtp, storeOtp } from '@/lib/otp'
import { logger } from '@/lib/logger'
import { db } from '@/db/client'
import { auditLog, profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

type ActionResult = { error: string } | { success: string }

async function getIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
}

async function getUserAgent(): Promise<string> {
  const h = await headers()
  return h.get('user-agent') ?? 'unknown'
}

async function writeAudit(
  action: string,
  actorId: string | null,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    const ip = await getIp()
    const ua = await getUserAgent()
    await db
      .insert(auditLog)
      .values({ action, actorId, metadata: meta, ipAddress: ip, userAgent: ua })
  } catch (err) {
    logger.error({ err, action }, '[audit] Échec écriture audit_log')
  }
}

// ─── Schémas Zod ────────────────────────────────────────────────────────────

const signUpSchema = z
  .object({
    email: z.string().email('Email invalide'),
    displayName: z.string().min(2, 'Nom trop court').max(50, 'Nom trop long'),
    password: z.string().min(12, 'Mot de passe trop court (12 car. min)'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

const signInSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

const resetRequestSchema = z.object({
  email: z.string().email('Email invalide'),
})

const resetPasswordSchema = z
  .object({
    password: z.string().min(12, 'Mot de passe trop court (12 car. min)'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

// ─── Actions ────────────────────────────────────────────────────────────────

export async function signUp(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await getIp()

  const { success: rateLimitOk } = await checkRateLimit('signup', ip)
  if (!rateLimitOk) {
    return { error: 'Trop de tentatives. Réessayez dans 1 heure.' }
  }

  const parsed = signUpSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const { email, password, displayName } = parsed.data

  const pwValidation = validatePassword(password)
  if (!pwValidation.valid) {
    return { error: pwValidation.errors[0] ?? 'Mot de passe invalide' }
  }

  const breached = await isPasswordBreached(password)
  if (breached) {
    return {
      error: 'Ce mot de passe a été compromis dans une fuite de données. Choisissez-en un autre.',
    }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback`,
      data: { display_name: displayName },
    },
  })

  if (error) {
    logger.warn({ email: '[REDACTED]' }, `[auth] signUp error: ${error.message}`)
    if (error.message.includes('already registered')) {
      return { error: 'Un compte existe déjà avec cet email.' }
    }
    return { error: "Erreur lors de l'inscription. Réessayez." }
  }

  await writeAudit('user.signup', null, { email: '[REDACTED]' })
  return { success: 'Email de confirmation envoyé ! Vérifiez votre boîte mail.' }
}

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await getIp()

  const { success: rateLimitOk } = await checkRateLimit('auth', ip)
  if (!rateLimitOk) {
    return { error: 'Trop de tentatives. Réessayez dans 1 minute.' }
  }

  const parsed = signInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const { email, password } = parsed.data
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await writeAudit('user.login_failed', null, { email: '[REDACTED]' })
    return { error: 'Email ou mot de passe incorrect.' }
  }

  const userId = data.user?.id ?? null
  await writeAudit('user.login', userId, {})

  // Notification nouvel appareil (best-effort, non bloquant)
  const ua = await getUserAgent()
  if (data.user?.email) {
    sendNewDeviceEmail(data.user.email, ip, ua).catch(() => undefined)
  }

  // Check if user has email OTP MFA enabled
  if (data.user?.id && data.user?.email) {
    const profile = await db
      .select({ mfaEnabledAt: profiles.mfaEnabledAt })
      .from(profiles)
      .where(eq(profiles.id, data.user.id))
      .limit(1)

    if (profile[0]?.mfaEnabledAt) {
      // Generate and send OTP to user's email
      const code = generateOtp()
      await storeOtp(data.user.id, code)
      sendMfaOtpEmail(data.user.email, code).catch(() => undefined)
      redirect('/auth/mfa')
    }
  }

  redirect('/')
}

export async function requestPasswordReset(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await getIp()

  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Email invalide' }
  }

  const { email } = parsed.data

  // Rate limit par email (on hash pour éviter de stocker l'email en clair dans Redis)
  const { success: rateLimitOk } = await checkRateLimit('signup', `reset:${ip}`)
  if (!rateLimitOk) {
    return { error: 'Trop de demandes. Réessayez dans 1 heure.' }
  }

  const supabase = await createServerClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/reset-password`,
  })

  // Réponse identique qu'il y ait ou non un compte (anti-enumeration)
  await writeAudit('user.password_reset_requested', null, { email: '[REDACTED]' })
  return { success: 'Si un compte existe, un email vous a été envoyé.' }
}

export async function resetPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const { password } = parsed.data

  const pwValidation = validatePassword(password)
  if (!pwValidation.valid) {
    return { error: pwValidation.errors[0] ?? 'Mot de passe invalide' }
  }

  const breached = await isPasswordBreached(password)
  if (breached) {
    return { error: 'Ce mot de passe a été compromis. Choisissez-en un autre.' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Impossible de mettre à jour le mot de passe. Le lien est peut-être expiré.' }
  }

  await writeAudit('user.password_reset_completed', user?.id ?? null, {})
  return { success: 'Mot de passe mis à jour. Vous pouvez vous connecter.' }
}

export async function signOut(): Promise<void> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase.auth.signOut()
  await writeAudit('user.logout', user?.id ?? null, {})
  redirect('/auth/login')
}
