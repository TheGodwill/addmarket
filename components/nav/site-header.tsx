import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { messages, conversations, sellerProfiles } from '@/db/schema'
import { and, count, eq, isNull, ne, or } from 'drizzle-orm'
import { UnreadBadge } from './unread-badge'

async function getUnreadCount(userId: string): Promise<number> {
  // Count unread messages in conversations where user is buyer or seller
  const rows = await db
    .select({ n: count(messages.id) })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .leftJoin(sellerProfiles, eq(sellerProfiles.id, conversations.sellerProfileId))
    .where(
      and(
        isNull(messages.readAt),
        ne(messages.senderId, userId),
        or(eq(conversations.buyerId, userId), eq(sellerProfiles.userId, userId)),
      ),
    )

  return Number(rows.at(0)?.n ?? 0)
}

export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const unread = user ? await getUnreadCount(user.id) : 0

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-blue-700">
          ADDMarket
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/search"
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            Rechercher
          </Link>
          <Link
            href="/explore"
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            Explorer
          </Link>
          <Link
            href="/sellers"
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            Vendeurs
          </Link>

          {user ? (
            <>
              <UnreadBadge initialCount={unread} userId={user.id} />
              <Link
                href="/sell"
                className="ml-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Vendre
              </Link>
              <Link
                href="/account"
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Mon compte
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Connexion
              </Link>
              <Link
                href="/auth/signup"
                className="ml-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
