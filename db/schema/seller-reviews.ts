import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
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
    // Nullable: SET NULL when reviewer's account is deleted (RGPD anonymisation)
    reviewerId: uuid('reviewer_id').references(() => profiles.id, { onDelete: 'set null' }),
    listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    // Enforced 1-5 via DB check constraint in migration SQL
    rating: integer('rating').notNull(),
    comment: text('comment'),
    response: text('response'),
    responseUpdatedAt: timestamp('response_updated_at', { withTimezone: true }),
    status: reviewStatusEnum('status').notNull().default('pending'),
    // true when reviewer had verified membership at submission time
    isVerified: boolean('is_verified').notNull().default(false),
    // Set by seller when reporting an abusive review
    reportReason: text('report_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One review per reviewer/seller pair — NULL reviewerId values are treated as distinct by postgres
    unique('reviews_unique_reviewer_seller').on(table.reviewerId, table.sellerId),
    index('seller_reviews_seller_id_idx').on(table.sellerId),
    index('seller_reviews_reviewer_id_idx').on(table.reviewerId),
    index('seller_reviews_status_idx').on(table.status),
  ],
)

export type SellerReview = InferSelectModel<typeof sellerReviews>
export type NewSellerReview = InferInsertModel<typeof sellerReviews>
