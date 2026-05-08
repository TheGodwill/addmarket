import 'server-only'
import { db } from '@/db/client'
import { notificationPrefs, profiles } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { createAdminClient } from './supabase/admin'
import { sendNewMessageEmail } from './email'
import { logger } from './logger'

async function isEmailEnabled(
  userId: string,
  type: 'new_message' | 'new_review' | 'review_response' | 'verification_update',
): Promise<boolean> {
  // If an explicit preference row exists, return its value.
  // If no row, default to true (opt-in by default).
  const row = await db
    .select({ enabled: notificationPrefs.enabled })
    .from(notificationPrefs)
    .where(
      and(
        eq(notificationPrefs.userId, userId),
        eq(notificationPrefs.type, type),
        eq(notificationPrefs.channel, 'email'),
      ),
    )
    .limit(1)
    .then((r) => r.at(0))

  return row ? row.enabled : true
}

async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user.email) return null
  return data.user.email
}

async function getDisplayName(userId: string): Promise<string> {
  const row = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)
    .then((r) => r.at(0))
  return row?.displayName ?? 'Utilisateur'
}

export async function notifyNewMessage(
  recipientId: string,
  senderId: string,
  conversationId: string,
): Promise<void> {
  try {
    const enabled = await isEmailEnabled(recipientId, 'new_message')
    if (!enabled) return

    const [email, recipientName, senderName] = await Promise.all([
      getUserEmail(recipientId),
      getDisplayName(recipientId),
      getDisplayName(senderId),
    ])

    if (!email) return

    await sendNewMessageEmail(email, recipientName, senderName, conversationId)
  } catch (err) {
    logger.error({ err, recipientId, conversationId }, '[notify] notifyNewMessage failed')
  }
}
