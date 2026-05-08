import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { listings } from './listings'

export const listingImages = pgTable(
  'listing_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    altText: text('alt_text'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    index('listing_images_listing_id_idx').on(table.listingId),
    index('listing_images_sort_order_idx').on(table.listingId, table.sortOrder),
  ],
)

export type ListingImage = InferSelectModel<typeof listingImages>
export type NewListingImage = InferInsertModel<typeof listingImages>
