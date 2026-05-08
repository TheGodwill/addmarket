import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { profiles } from './profiles'
import { listings } from './listings'
import { sellerProfiles } from './seller-profiles'

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
  'cancelled',
])

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    sellerProfileId: uuid('seller_profile_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    // Stripe identifiers
    stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    status: orderStatusEnum('status').notNull().default('pending'),
    // Amount captured at checkout time — never recomputed from listing price
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('eur'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => [
    index('orders_buyer_id_idx').on(table.buyerId),
    index('orders_seller_profile_id_idx').on(table.sellerProfileId),
    index('orders_status_idx').on(table.status),
    index('orders_listing_id_idx').on(table.listingId),
  ],
)

export type Order = InferSelectModel<typeof orders>
export type NewOrder = InferInsertModel<typeof orders>
