import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { listings } from './listings'

export const listingViews = pgTable(
  'listing_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    // SHA-256 of visitor IP — never store raw IPs (RGPD)
    ipHash: text('ip_hash').notNull(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('listing_views_listing_id_idx').on(table.listingId),
    index('listing_views_ip_listing_idx').on(table.listingId, table.ipHash),
    index('listing_views_viewed_at_idx').on(table.viewedAt),
  ],
)

export type ListingView = InferSelectModel<typeof listingViews>
export type NewListingView = InferInsertModel<typeof listingViews>
