'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadCardPhoto } from '@/lib/storage'
import { hashCardNumber } from '@/lib/crypto'
import { sendReferentNotificationEmail, sendVerificationSubmittedEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { db } from '@/db/client'
import { auditLog, churchReferents, churches, profiles, verificationRequests } from '@/db/schema'

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

export async function searchChurches(
  query: string,
): Promise<Array<{ id: string; name: string; city: string }>> {
  if (query.length < 2) return []
  return db
    .select({ id: churches.id, name: churches.name, city: churches.city })
    .from(churches)
    .where(
      and(
        eq(churches.isActive, true),
        or(ilike(churches.name, `%${query}%`), ilike(churches.city, `%${query}%`)),
      ),
    )
    .limit(10)
}

const onboardingSchema = z.object({
  church_id: z.string().uuid('Église invalide'),
  display_name: z.string().min(2, 'Nom trop court').max(50, 'Nom trop long'),
  city: z.string().min(2, 'Ville trop courte').max(100, 'Ville trop longue'),
  phone: z
    .string()
    .regex(/^(\+?\d[\d\s\-.()]{6,20})?$/, 'Numéro invalide')
    .optional(),
  card_number: z
    .string()
    .min(4, 'Numéro de carte requis')
    .max(20, 'Numéro trop long')
    .regex(/^\d+$/, 'Le numéro ne doit contenir que des chiffres'),
  accept_cgu: z.literal('on', { errorMap: () => ({ message: 'Vous devez accepter les CGU' }) }),
  accept_rgpd: z.literal('on', {
    errorMap: () => ({ message: 'Vous devez accepter la politique RGPD' }),
  }),
})

export async function submitOnboarding(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Reconnectez-vous.' }

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === 'string'))
  const parsed = onboardingSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }
  const { church_id, display_name, city, phone, card_number } = parsed.data

  // Check if already has an active or pending request
  const existing = await db
    .select({
      id: verificationRequests.id,
      status: verificationRequests.status,
      resubmitAfter: verificationRequests.resubmitAfter,
    })
    .from(verificationRequests)
    .where(eq(verificationRequests.userId, user.id))
    .orderBy(desc(verificationRequests.submittedAt))
    .limit(5)

  const active = existing.find(
    (r) => r.status === 'pending' || r.status === 'approved' || r.status === 'waiting',
  )
  if (active) {
    if (active.status === 'approved') return { error: 'Votre compte est déjà vérifié.' }
    return { error: `Vous avez déjà une demande en cours (${active.status}).` }
  }

  const lastRejected = existing.find((r) => r.status === 'rejected')
  if (lastRejected?.resubmitAfter && new Date() < lastRejected.resubmitAfter) {
    const hours = Math.ceil((lastRejected.resubmitAfter.getTime() - Date.now()) / 3_600_000)
    return { error: `Vous pouvez soumettre une nouvelle demande dans ${hours}h.` }
  }

  // Validate and upload photos
  const photoFront = formData.get('photo_front') as File | null
  if (!photoFront || photoFront.size === 0) {
    return { error: 'La photo recto de la carte est requise.' }
  }

  const frontResult = await uploadCardPhoto(photoFront, user.id, 'front')
  if ('error' in frontResult) return frontResult

  let backPath: string | undefined
  const photoBack = formData.get('photo_back') as File | null
  if (photoBack && photoBack.size > 0) {
    const backResult = await uploadCardPhoto(photoBack, user.id, 'back')
    if ('error' in backResult) return backResult
    backPath = backResult.path
  }

  // Hash card number (argon2id) + keep last 4 for display
  const normalizedCard = card_number.replace(/\D/g, '')
  const cardHash = await hashCardNumber(normalizedCard)
  const cardLast4 = normalizedCard.slice(-4)

  // Encrypt phone if provided
  let phoneEncrypted: string | undefined
  if (phone?.trim()) {
    const { encryptPhone } = await import('@/lib/phone-crypto')
    phoneEncrypted = encryptPhone(phone.trim())
  }

  try {
    await db.insert(verificationRequests).values({
      userId: user.id,
      churchId: church_id,
      cardPhotoStoragePath: frontResult.path,
      cardPhotoBackStoragePath: backPath,
      cardNumberHash: cardHash,
      cardNumberLast4: cardLast4,
      submissionDisplayName: display_name,
      submissionCity: city,
    })

    await db
      .update(profiles)
      .set({
        displayName: display_name,
        city,
        churchId: church_id,
        phoneEncrypted: phoneEncrypted ?? null,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    await writeAudit('verification.submitted', user.id, { churchId: church_id })

    if (user.email) {
      sendVerificationSubmittedEmail(user.email, display_name).catch(() => undefined)
    }

    // Notify each referent of the chosen church
    const refs = await db
      .select({ userId: churchReferents.userId })
      .from(churchReferents)
      .where(eq(churchReferents.churchId, church_id))

    const church = await db
      .select({ name: churches.name, city: churches.city })
      .from(churches)
      .where(eq(churches.id, church_id))
      .limit(1)

    const churchLabel = church[0] ? `${church[0].name} (${church[0].city})` : 'votre église'
    const admin = createAdminClient()

    for (const ref of refs) {
      try {
        const {
          data: { user: refUser },
        } = await admin.auth.admin.getUserById(ref.userId)
        if (refUser?.email) {
          sendReferentNotificationEmail(refUser.email, display_name, churchLabel).catch(
            () => undefined,
          )
        }
      } catch {
        // Non-blocking
      }
    }
  } catch (err) {
    logger.error({ err }, '[onboarding] Échec soumission')
    return { error: 'Erreur lors de la soumission. Réessayez.' }
  }

  // Mark onboarding done in a long-lived cookie so the proxy skips the redirect
  const jar = await cookies()
  jar.set('ob_done', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 3600,
  })

  redirect('/')
}

export async function getOnboardingStatus(userId: string): Promise<{
  completed: boolean
  hasPendingRequest: boolean
}> {
  const profile = await db
    .select({ onboardingCompletedAt: profiles.onboardingCompletedAt })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  const completed =
    profile[0]?.onboardingCompletedAt !== null && profile[0]?.onboardingCompletedAt !== undefined

  if (!completed) return { completed: false, hasPendingRequest: false }

  const pending = await db
    .select({ id: verificationRequests.id })
    .from(verificationRequests)
    .where(and(eq(verificationRequests.userId, userId), isNull(verificationRequests.processedAt)))
    .limit(1)

  return { completed: true, hasPendingRequest: pending.length > 0 }
}
