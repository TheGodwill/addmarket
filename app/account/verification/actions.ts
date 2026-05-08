'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/db/client'
import { verificationRequests, profiles, churches } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { uploadCardPhoto } from '@/lib/storage'
import { hashCardNumber } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function submitVerificationRequest(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { success } = await checkRateLimit('verificationSubmit', user.id)
  if (!success) {
    return { error: 'Trop de soumissions. Réessayez demain.' }
  }

  const churchId = formData.get('churchId') as string | null
  const cardNumber = (formData.get('cardNumber') as string | null)?.trim() ?? ''
  const front = formData.get('front') as File | null
  const back = formData.get('back') as File | null

  if (!churchId) return { error: 'Veuillez sélectionner votre église.' }
  if (!front || front.size === 0) return { error: 'La photo recto de la carte est requise.' }

  // Check church exists
  const church = await db
    .select({ id: churches.id })
    .from(churches)
    .where(and(eq(churches.id, churchId), eq(churches.isActive, true)))
    .limit(1)
    .then((r) => r.at(0))
  if (!church) return { error: 'Église introuvable.' }

  // Check no pending request already exists
  const existing = await db
    .select({ id: verificationRequests.id, status: verificationRequests.status })
    .from(verificationRequests)
    .where(eq(verificationRequests.userId, user.id))
    .orderBy(verificationRequests.submittedAt)
    .limit(1)
    .then((r) => r.at(0))

  if (existing?.status === 'pending') {
    return { error: 'Une demande est déjà en cours de traitement.' }
  }

  // Fetch profile for submission snapshot
  const profile = await db
    .select({ displayName: profiles.displayName, city: profiles.city })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)
    .then((r) => r.at(0))

  // Upload front photo
  const frontResult = await uploadCardPhoto(front, user.id, 'front')
  if ('error' in frontResult) return { error: frontResult.error }

  // Upload back photo (optional)
  let backPath: string | undefined
  if (back && back.size > 0) {
    const backResult = await uploadCardPhoto(back, user.id, 'back')
    if ('error' in backResult) return { error: backResult.error }
    backPath = backResult.path
  }

  // Hash card number if provided
  let cardNumberHash: string | undefined
  let cardNumberLast4: string | undefined
  const digitsOnly = cardNumber.replace(/\D/g, '')
  if (digitsOnly.length >= 4) {
    cardNumberHash = await hashCardNumber(digitsOnly)
    cardNumberLast4 = digitsOnly.slice(-4)
  }

  try {
    const admin = createAdminClient()

    const newReq = await db
      .insert(verificationRequests)
      .values({
        userId: user.id,
        churchId,
        cardPhotoStoragePath: frontResult.path,
        cardPhotoBackStoragePath: backPath,
        cardNumberHash,
        cardNumberLast4,
        submissionDisplayName: profile?.displayName ?? null,
        submissionCity: profile?.city ?? null,
        status: 'pending',
      })
      .returning({ id: verificationRequests.id })
      .then((r) => r.at(0))

    await admin.from('audit_log').insert({
      actor_id: user.id,
      action: 'verification.submitted',
      target_type: 'verification_request',
      target_id: newReq?.id,
      metadata: { churchId },
    })

    logger.info({ userId: user.id, requestId: newReq?.id }, '[verification] demande soumise')
  } catch (err) {
    logger.error({ err }, '[verification] erreur insertion')
    return { error: 'Erreur lors de la soumission. Réessayez.' }
  }

  redirect('/account/verification?submitted=1')
}

export async function cancelVerificationRequest(requestId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const req = await db
    .select({ status: verificationRequests.status })
    .from(verificationRequests)
    .where(and(eq(verificationRequests.id, requestId), eq(verificationRequests.userId, user.id)))
    .limit(1)
    .then((r) => r.at(0))

  if (!req || req.status !== 'pending') return { error: 'Demande introuvable ou non annulable.' }

  await db
    .update(verificationRequests)
    .set({ status: 'cancelled' })
    .where(eq(verificationRequests.id, requestId))

  return { ok: true }
}
