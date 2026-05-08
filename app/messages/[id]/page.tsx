import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { conversations, messages, profiles, sellerProfiles, listings } from '@/db/schema'
import { eq, and, asc, isNull } from 'drizzle-orm'
import { MessageThread } from './message-thread'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return { title: `Conversation · ${id.slice(0, 8)}` }
}

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Load conversation with participants info
  const convRows = await db
    .select({
      id: conversations.id,
      buyerId: conversations.buyerId,
      sellerProfileId: conversations.sellerProfileId,
      listingId: conversations.listingId,
      buyerName: profiles.displayName,
      sellerBusinessName: sellerProfiles.businessName,
      sellerSlug: sellerProfiles.slug,
      sellerUserId: sellerProfiles.userId,
      listingTitle: listings.title,
    })
    .from(conversations)
    .innerJoin(profiles, eq(profiles.id, conversations.buyerId))
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, conversations.sellerProfileId))
    .leftJoin(listings, eq(listings.id, conversations.listingId))
    .where(eq(conversations.id, id))
    .limit(1)

  const conv = convRows.at(0)
  if (!conv) notFound()

  // Authz: only buyer or seller can view
  const isParticipant = conv.buyerId === user.id || conv.sellerUserId === user.id
  if (!isParticipant) notFound()

  // Load messages (oldest first)
  const msgs = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
      readAt: messages.readAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .limit(100)

  // Mark unread messages as read (messages sent by the other party)
  const unreadIds = msgs.filter((m) => m.senderId !== user.id && m.readAt === null).map((m) => m.id)

  if (unreadIds.length > 0) {
    await Promise.all(
      unreadIds.map((msgId) =>
        db
          .update(messages)
          .set({ readAt: new Date() })
          .where(and(eq(messages.id, msgId), isNull(messages.readAt))),
      ),
    )
  }

  const otherName = conv.buyerId === user.id ? conv.sellerBusinessName : conv.buyerName

  const serialised = msgs.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }))

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/messages" className="text-sm text-blue-600 hover:underline">
          ← Messages
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{otherName}</p>
          {conv.listingTitle && (
            <p className="truncate text-xs text-gray-400">
              Re :{' '}
              {conv.listingId ? (
                <Link href={`/listings/${conv.listingId}`} className="hover:underline">
                  {conv.listingTitle}
                </Link>
              ) : (
                conv.listingTitle
              )}
            </p>
          )}
        </div>
        {conv.sellerSlug && conv.buyerId === user.id && (
          <Link
            href={`/sellers/${conv.sellerSlug}`}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Profil vendeur
          </Link>
        )}
      </div>

      {/* Thread (client component with Realtime) */}
      <MessageThread conversationId={id} currentUserId={user.id} initialMessages={serialised} />
    </div>
  )
}
