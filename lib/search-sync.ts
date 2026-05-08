import 'server-only'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { listings, sellerProfiles, categories, sellerReviews } from '@/db/schema'
import {
  meiliAdmin,
  LISTINGS_INDEX,
  SELLERS_INDEX,
  type ListingDocument,
  type SellerDocument,
} from './meilisearch'
import { logger } from './logger'

// ---- Listing sync ----

export async function syncListing(listingId: string): Promise<void> {
  if (!meiliAdmin) return

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
    .where(eq(listings.id, listingId))
    .limit(1)

  const row = rows.at(0)
  if (!row) return

  if (row.status !== 'active') {
    await meiliAdmin.index(LISTINGS_INDEX).deleteDocument(listingId)
    return
  }

  const doc: ListingDocument = {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    sellerId: row.sellerId,
    sellerSlug: row.sellerSlug ?? null,
    sellerName: row.sellerName ?? '',
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? null,
    categorySlug: row.categorySlug ?? null,
    priceCents: row.priceCents ?? null,
    isQuoteOnly: row.isQuoteOnly,
    tags: row.tags,
    images: row.images,
    stockStatus: row.stockStatus,
    serviceCities: row.serviceCities ?? [],
    status: row.status,
    createdAt: Math.floor(row.createdAt.getTime() / 1000),
    publishedAt: row.publishedAt ? Math.floor(row.publishedAt.getTime() / 1000) : null,
  }

  await meiliAdmin.index(LISTINGS_INDEX).addDocuments([doc])
  logger.info({ listingId }, '[meili] listing synced')
}

export async function deleteListing(listingId: string): Promise<void> {
  if (!meiliAdmin) return
  await meiliAdmin.index(LISTINGS_INDEX).deleteDocument(listingId)
}

// ---- Seller sync ----

export async function syncSeller(sellerId: string): Promise<void> {
  if (!meiliAdmin) return

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
    .where(eq(sellerProfiles.id, sellerId))
    .limit(1)

  const row = rows.at(0)
  if (!row) return

  if (!row.isActive) {
    await meiliAdmin.index(SELLERS_INDEX).deleteDocument(sellerId)
    return
  }

  const [reviewStats, listingCountRow] = await Promise.all([
    db
      .select({
        avg: sql<number>`avg(rating)::numeric(3,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(sellerReviews)
      .where(and(eq(sellerReviews.sellerId, sellerId), eq(sellerReviews.status, 'published'))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(and(eq(listings.sellerId, sellerId), eq(listings.status, 'active'))),
  ])

  const doc: SellerDocument = {
    id: row.id,
    slug: row.slug,
    businessName: row.businessName,
    description: row.description ?? null,
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? null,
    categorySlug: row.categorySlug ?? null,
    serviceCities: row.serviceCities ?? [],
    serviceAreaKm: row.serviceAreaKm ?? null,
    logoUrl: row.logoUrl ?? null,
    isActive: row.isActive,
    avgRating: reviewStats.at(0)?.avg ?? null,
    reviewCount: reviewStats.at(0)?.count ?? 0,
    listingCount: listingCountRow.at(0)?.count ?? 0,
    createdAt: Math.floor(row.createdAt.getTime() / 1000),
  }

  await meiliAdmin.index(SELLERS_INDEX).addDocuments([doc])
  logger.info({ sellerId }, '[meili] seller synced')
}

export async function deleteSeller(sellerId: string): Promise<void> {
  if (!meiliAdmin) return
  await meiliAdmin.index(SELLERS_INDEX).deleteDocument(sellerId)
}
