'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { conversations, messages, sellerProfiles, auditLog } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z
    .string()
    .min(1, 'Le message ne peut pas être vide')
    .max(2000, 'Message trop long (2000 caractères max)')
    .transform((v) => v.trim()),
})

export async function sendMessage(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Rate limiting by user ID
  const rl = await checkRateLimit('messageSend', user.id)
  if (!rl.success) {
    return { error: 'Vous envoyez des messages trop vite. Attendez un moment.' }
  }

  const parsed = sendSchema.safeParse({
    conversationId: formData.get('conversationId'),
    body: formData.get('body'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const { conversationId, body } = parsed.data

  // Verify caller is a participant in this conversation
  const conv = await db
    .select({ buyerId: conversations.buyerId, sellerProfileId: conversations.sellerProfileId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1)
    .then((r) => r.at(0))

  if (!conv) return { error: 'Conversation introuvable' }

  // Resolve seller's user ID for authz check
  const sellerRow = await db
    .select({ userId: sellerProfiles.userId })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.id, conv.sellerProfileId))
    .limit(1)
    .then((r) => r.at(0))

  const isParticipant = conv.buyerId === user.id || (sellerRow && sellerRow.userId === user.id)
  if (!isParticipant) return { error: 'Accès refusé' }

  await db.insert(messages).values({
    conversationId,
    senderId: user.id,
    body,
  })

  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'message.send',
    targetType: 'conversation',
    targetId: conversationId,
    metadata: { length: body.length },
  })

  return { ok: true }
}

const startSchema = z.object({
  sellerProfileId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  body: z
    .string()
    .min(1)
    .max(2000)
    .transform((v) => v.trim()),
})

export async function startConversation(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  const rl = await checkRateLimit('messageSend', ip)
  if (!rl.success) {
    return { error: 'Trop de messages. Attendez un moment.' }
  }

  const parsed = startSchema.safeParse({
    sellerProfileId: formData.get('sellerProfileId'),
    listingId: formData.get('listingId') ?? undefined,
    body: formData.get('body'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const { sellerProfileId, listingId, body } = parsed.data

  // Prevent messaging yourself
  const sellerRow = await db
    .select({ userId: sellerProfiles.userId })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.id, sellerProfileId))
    .limit(1)
    .then((r) => r.at(0))

  if (!sellerRow) return { error: 'Vendeur introuvable' }
  if (sellerRow.userId === user.id) return { error: 'Vous ne pouvez pas vous écrire à vous-même' }

  // Find-or-create conversation
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.buyerId, user.id), eq(conversations.sellerProfileId, sellerProfileId)),
    )
    .limit(1)
    .then((r) => r.at(0))

  let conversationId: string

  if (existing) {
    conversationId = existing.id
    // Update listing context if provided
    if (listingId) {
      await db.update(conversations).set({ listingId }).where(eq(conversations.id, conversationId))
    }
  } else {
    const [created] = await db
      .insert(conversations)
      .values({
        buyerId: user.id,
        sellerProfileId,
        ...(listingId ? { listingId } : {}),
      })
      .returning({ id: conversations.id })
    if (!created) return { error: 'Erreur lors de la création de la conversation' }
    conversationId = created.id
  }

  await db.insert(messages).values({ conversationId, senderId: user.id, body })

  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'message.send',
    targetType: 'conversation',
    targetId: conversationId,
    metadata: { length: body.length, new: !existing },
  })

  redirect(`/messages/${conversationId}`)
}
