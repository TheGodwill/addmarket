import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { profiles } from './profiles'
import { listings } from './listings'
import { sellerProfiles } from './seller-profiles'

export const quoteStatusEnum = pgEnum('quote_status', [
  'pending',
  'quoted',
  'accepted',
  'rejected',
  'expired',
])

export const quoteRequests = pgTable(
  'quote_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    sellerProfileId: uuid('seller_profile_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    // Buyer's initial message
    message: text('message').notNull(),
    status: quoteStatusEnum('status').notNull().default('pending'),
    // Seller's optional quoted price and note
    quotedPriceCents: integer('quoted_price_cents'),
    sellerNote: text('seller_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('quote_requests_buyer_id_idx').on(table.buyerId),
    index('quote_requests_seller_profile_id_idx').on(table.sellerProfileId),
    index('quote_requests_status_idx').on(table.status),
    index('quote_requests_listing_id_idx').on(table.listingId),
  ],
)

export type QuoteRequest = InferSelectModel<typeof quoteRequests>
export type NewQuoteRequest = InferInsertModel<typeof quoteRequests>
