'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { notificationPrefs } from '@/db/schema'

const TYPES = ['new_message', 'new_review', 'review_response', 'verification_update'] as const

const prefSchema = z.object({
  type: z.enum(TYPES),
  channel: z.literal('email'),
  enabled: z.boolean(),
})

export async function updateNotificationPref(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const parsed = prefSchema.safeParse({
    type: formData.get('type'),
    channel: formData.get('channel') ?? 'email',
    enabled: formData.get('enabled') === 'true',
  })
  if (!parsed.success) return { error: 'Données invalides' }

  const { type, channel, enabled } = parsed.data

  await db
    .insert(notificationPrefs)
    .values({ userId: user.id, type, channel, enabled })
    .onConflictDoUpdate({
      target: [notificationPrefs.userId, notificationPrefs.type, notificationPrefs.channel],
      set: { enabled, updatedAt: new Date() },
    })

  return { ok: true }
}
