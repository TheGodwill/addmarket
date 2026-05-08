import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { sellerProfiles } from './seller-profiles'
import { profiles } from './profiles'
import { listings } from './listings'

export const reviewStatusEnum = pgEnum('review_status', ['pending', 'published', 'hidden'])

export const sellerReviews = pgTable(
  'seller_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    // Enforced 1-5 via DB check constraint in migration SQL
    rating: integer('rating').notNull(),
    comment: text('comment'),
    response: text('response'),
    status: reviewStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One review per reviewer/seller/listing combination
    unique('reviews_unique_reviewer_seller_listing').on(
      table.reviewerId,
      table.sellerId,
      table.listingId,
    ),
    index('seller_reviews_seller_id_idx').on(table.sellerId),
    index('seller_reviews_reviewer_id_idx').on(table.reviewerId),
    index('seller_reviews_status_idx').on(table.status),
  ],
)

export type SellerReview = InferSelectModel<typeof sellerReviews>
export type NewSellerReview = InferInsertModel<typeof sellerReviews>
