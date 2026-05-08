import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { profiles } from './profiles'
import { sellerProfiles } from './seller-profiles'
import { listings } from './listings'

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    sellerProfileId: uuid('seller_profile_id')
      .notNull()
      .references(() => sellerProfiles.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One thread per buyer+seller pair (listing is optional context, not part of key)
    uniqueIndex('conversations_buyer_seller_unique').on(table.buyerId, table.sellerProfileId),
    index('conversations_buyer_id_idx').on(table.buyerId),
    index('conversations_seller_profile_id_idx').on(table.sellerProfileId),
    index('conversations_last_message_at_idx').on(table.lastMessageAt),
  ],
)

export type Conversation = InferSelectModel<typeof conversations>
export type NewConversation = InferInsertModel<typeof conversations>
