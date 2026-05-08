import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { sellerProfiles } from './seller-profiles'
import { categories } from './categories'

// Managed by trigger — never written directly from application code
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const stockStatusEnum = pgEnum('stock_status', ['in_stock', 'low', 'out', 'n/a'])
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'active', 'paused', 'removed'])

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    // Stored in euro cents — NEVER float. Null when is_quote_only = true.
    priceCents: integer('price_cents'),
    currency: text('currency').notNull().default('EUR'),
    isQuoteOnly: boolean('is_quote_only').notNull().default(false),
    stockStatus: stockStatusEnum('stock_status').notNull().default('in_stock'),
    // Ordered array of image URLs (denormalized from listing_images for fast reads)
    images: text('images').array().notNull().default([]),
    tags: text('tags').array().notNull().default([]),
    status: listingStatusEnum('status').notNull().default('draft'),
    // Maintained by update_listing_search_vector trigger — do not write from app
    searchVector: tsvector('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    // Slug is unique within a seller's catalog
    uniqueIndex('listings_seller_slug_unique').on(table.sellerId, table.slug),
    index('listings_status_idx').on(table.status),
    index('listings_seller_id_idx').on(table.sellerId),
    index('listings_published_at_idx').on(table.publishedAt),
    index('listings_category_id_idx').on(table.categoryId),
    // GIN index for full-text search — created in migration SQL (not expressible in Drizzle)
  ],
)

export type Listing = InferSelectModel<typeof listings>
export type NewListing = InferInsertModel<typeof listings>
