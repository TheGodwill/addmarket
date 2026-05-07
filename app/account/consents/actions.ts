'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { consents, CONSENT_TYPES, type ConsentType } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

type ActionResult = { error: string } | { success: true }

export async function updateConsent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const consentType = formData.get('consent_type') as string
  const granted = formData.get('granted') === 'true'

  if (!(CONSENT_TYPES as ReadonlyArray<string>).includes(consentType)) {
    return { error: 'Type de consentement invalide.' }
  }

  const now = new Date()

  await db
    .insert(consents)
    .values({
      userId: user.id,
      consentType: consentType as ConsentType,
      granted,
      grantedAt: granted ? now : null,
      revokedAt: !granted ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [consents.userId, consents.consentType],
      set: {
        granted,
        grantedAt: granted ? now : null,
        revokedAt: !granted ? now : null,
        updatedAt: now,
      },
    })

  return { success: true }
}

export async function revokeAllConsents(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()

  await db
    .update(consents)
    .set({ granted: false, revokedAt: now, updatedAt: now })
    .where(and(eq(consents.userId, user.id), eq(consents.granted, true)))

  return { success: true }
}
