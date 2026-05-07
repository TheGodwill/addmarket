import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const churches = pgTable(
  'churches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    city: text('city').notNull(),
    region: text('region').notNull(),
    address: text('address'),
    pastor: text('pastor'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('churches_region_idx').on(table.region)],
)

export type Church = InferSelectModel<typeof churches>
export type NewChurch = InferInsertModel<typeof churches>
