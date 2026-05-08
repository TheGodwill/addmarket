import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const membershipOrderStatusEnum = pgEnum('membership_order_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
])

export const membershipOrders = pgTable('membership_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('eur'),
  durationDays: integer('duration_days').notNull().default(365),
  status: membershipOrderStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
})

export type MembershipOrder = InferSelectModel<typeof membershipOrders>
export type NewMembershipOrder = InferInsertModel<typeof membershipOrders>
