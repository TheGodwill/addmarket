import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { conversations, messages, profiles, sellerProfiles } from '@/db/schema'
import { eq, desc, count, and, isNull, ne } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Messages' }

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Conversations where I am buyer
  const asBuyer = await db
    .select({
      id: conversations.id,
      lastMessageAt: conversations.lastMessageAt,
      otherName: sellerProfiles.businessName,
      otherSlug: sellerProfiles.slug,
    })
    .from(conversations)
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, conversations.sellerProfileId))
    .where(eq(conversations.buyerId, user.id))
    .orderBy(desc(conversations.lastMessageAt))

  // Conversations where I am the seller
  const asSeller = await db
    .select({
      id: conversations.id,
      lastMessageAt: conversations.lastMessageAt,
      otherName: profiles.displayName,
      otherSlug: profiles.id, // buyer has no slug — use id
    })
    .from(conversations)
    .innerJoin(sellerProfiles, eq(sellerProfiles.id, conversations.sellerProfileId))
    .innerJoin(profiles, eq(profiles.id, conversations.buyerId))
    .where(eq(sellerProfiles.userId, user.id))
    .orderBy(desc(conversations.lastMessageAt))

  // Unread counts per conversation
  const unreadRows = await db
    .select({
      conversationId: messages.conversationId,
      unread: count(messages.id),
    })
    .from(messages)
    .where(and(isNull(messages.readAt), ne(messages.senderId, user.id)))
    .groupBy(messages.conversationId)

  const unreadMap = new Map(unreadRows.map((r) => [r.conversationId, Number(r.unread)]))

  const allConvs = [
    ...asBuyer.map((c) => ({ ...c, role: 'buyer' as const })),
    ...asSeller.map((c) => ({ ...c, role: 'seller' as const })),
  ].sort((a, b) => {
    const ta = a.lastMessageAt?.getTime() ?? 0
    const tb = b.lastMessageAt?.getTime() ?? 0
    return tb - ta
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Messages</h1>

      {allConvs.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Aucune conversation pour l&apos;instant.</p>
          <p className="mt-1 text-sm text-gray-400">
            Contactez un vendeur depuis sa page profil pour démarrer.
          </p>
        </div>
      )}

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {allConvs.map((c) => {
          const unread = unreadMap.get(c.id) ?? 0
          return (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  {c.otherName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${unread > 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                  >
                    {c.otherName}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {c.lastMessageAt
                      ? new Date(c.lastMessageAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Aucun message'}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
