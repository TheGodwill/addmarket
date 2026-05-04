import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

export const health = pgTable('_health', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
