import 'server-only'
import { createHash } from 'crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { listingViews } from '@/db/schema'

export async function recordListingView(listingId: string, ip: string): Promise<void> {
  const ipHash = createHash('sha256')
    .update(ip || 'unknown')
    .digest('hex')
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  try {
    const existing = await db
      .select({ id: listingViews.id })
      .from(listingViews)
      .where(
        and(
          eq(listingViews.listingId, listingId),
          eq(listingViews.ipHash, ipHash),
          sql`${listingViews.viewedAt} > ${since}`,
        ),
      )
      .limit(1)

    if (!existing.at(0)) {
      await db.insert(listingViews).values({ listingId, ipHash })
    }
  } catch {
    // Never fail page render if view tracking fails
  }
}

export async function getListingViewCount(listingId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listingViews)
    .where(eq(listingViews.listingId, listingId))
  return row?.count ?? 0
}
