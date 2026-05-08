/**
 * Initial bulk sync: pushes all active listings and active sellers to Meilisearch.
 * Run once after creating the Meilisearch cloud instance or when re-indexing.
 *
 *   pnpm sync:meili
 */
import 'dotenv/config'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { listings, sellerProfiles, categories, sellerReviews } from '../db/schema'
import { MeiliSearch } from 'meilisearch'
import { configureIndexes, LISTINGS_INDEX, SELLERS_INDEX } from '../lib/meilisearch'
import type { ListingDocument, SellerDocument } from '../lib/meilisearch'

const BATCH = 200

function meili() {
  const host = process.env.MEILISEARCH_HOST
  const key = process.env.MEILISEARCH_ADMIN_KEY
  if (!host || !key) throw new Error('MEILISEARCH_HOST and MEILISEARCH_ADMIN_KEY are required')
  return new MeiliSearch({ host, apiKey: key })
}

async function syncListings(client: MeiliSearch) {
  console.warn('[sync] Syncing listings…')
  let offset = 0
  let total = 0

  for (;;) {
    const rows = await db
      .select({
        id: listings.id,
        title: listings.title,
        description: listings.description,
        slug: listings.slug,
        sellerId: listings.sellerId,
        sellerSlug: sellerProfiles.slug,
        sellerName: sellerProfiles.businessName,
        categoryId: listings.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        priceCents: listings.priceCents,
        isQuoteOnly: listings.isQuoteOnly,
        tags: listings.tags,
        images: listings.images,
        stockStatus: listings.stockStatus,
        serviceCities: sellerProfiles.serviceCities,
        status: listings.status,
        createdAt: listings.createdAt,
        publishedAt: listings.publishedAt,
      })
      .from(listings)
      .leftJoin(sellerProfiles, eq(listings.sellerId, sellerProfiles.id))
      .leftJoin(categories, eq(listings.categoryId, categories.id))
      .where(eq(listings.status, 'active'))
      .limit(BATCH)
      .offset(offset)

    if (rows.length === 0) break

    const docs: ListingDocument[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      slug: r.slug,
      sellerId: r.sellerId,
      sellerSlug: r.sellerSlug ?? null,
      sellerName: r.sellerName ?? '',
      categoryId: r.categoryId ?? null,
      categoryName: r.categoryName ?? null,
      categorySlug: r.categorySlug ?? null,
      priceCents: r.priceCents ?? null,
      isQuoteOnly: r.isQuoteOnly,
      tags: r.tags,
      images: r.images,
      stockStatus: r.stockStatus,
      serviceCities: r.serviceCities ?? [],
      status: r.status,
      createdAt: Math.floor(r.createdAt.getTime() / 1000),
      publishedAt: r.publishedAt ? Math.floor(r.publishedAt.getTime() / 1000) : null,
    }))

    await client.index(LISTINGS_INDEX).addDocuments(docs)
    total += docs.length
    offset += BATCH
    console.warn(`  [listings] ${total} synced…`)

    if (rows.length < BATCH) break
  }

  console.warn(`[sync] listings done — ${total} documents`)
}

async function syncSellers(client: MeiliSearch) {
  console.warn('[sync] Syncing sellers…')
  let offset = 0
  let total = 0

  for (;;) {
    const rows = await db
      .select({
        id: sellerProfiles.id,
        slug: sellerProfiles.slug,
        businessName: sellerProfiles.businessName,
        description: sellerProfiles.description,
        categoryId: sellerProfiles.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        serviceCities: sellerProfiles.serviceCities,
        serviceAreaKm: sellerProfiles.serviceAreaKm,
        logoUrl: sellerProfiles.logoUrl,
        isActive: sellerProfiles.isActive,
        createdAt: sellerProfiles.createdAt,
      })
      .from(sellerProfiles)
      .leftJoin(categories, eq(sellerProfiles.categoryId, categories.id))
      .where(eq(sellerProfiles.isActive, true))
      .limit(BATCH)
      .offset(offset)

    if (rows.length === 0) break

    const docs: SellerDocument[] = await Promise.all(
      rows.map(async (r) => {
        const [reviewStats, listingCountRow] = await Promise.all([
          db
            .select({
              avg: sql<number>`avg(rating)::numeric(3,2)`,
              count: sql<number>`count(*)::int`,
            })
            .from(sellerReviews)
            .where(and(eq(sellerReviews.sellerId, r.id), eq(sellerReviews.status, 'published'))),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(listings)
            .where(and(eq(listings.sellerId, r.id), eq(listings.status, 'active'))),
        ])
        return {
          id: r.id,
          slug: r.slug,
          businessName: r.businessName,
          description: r.description ?? null,
          categoryId: r.categoryId ?? null,
          categoryName: r.categoryName ?? null,
          categorySlug: r.categorySlug ?? null,
          serviceCities: r.serviceCities,
          serviceAreaKm: r.serviceAreaKm ?? null,
          logoUrl: r.logoUrl ?? null,
          isActive: r.isActive,
          avgRating: reviewStats.at(0)?.avg ?? null,
          reviewCount: reviewStats.at(0)?.count ?? 0,
          listingCount: listingCountRow.at(0)?.count ?? 0,
          createdAt: Math.floor(r.createdAt.getTime() / 1000),
        }
      }),
    )

    await client.index(SELLERS_INDEX).addDocuments(docs)
    total += docs.length
    offset += BATCH
    console.warn(`  [sellers] ${total} synced…`)

    if (rows.length < BATCH) break
  }

  console.warn(`[sync] sellers done — ${total} documents`)
}

async function main() {
  const client = meili()
  console.warn('[sync] Configuring indexes…')
  await configureIndexes()
  await Promise.all([syncListings(client), syncSellers(client)])
  console.warn('[sync] Complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[sync] Fatal error:', err)
  process.exit(1)
})
