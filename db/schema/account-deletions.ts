import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const accountDeletionRequests = pgTable(
  'account_deletion_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Not a FK — kept as a plain UUID so the record survives user deletion for audit
    userId: uuid('user_id').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    // 30-day cooling period — cron processes after this date
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    // Random token included in the cancellation email link
    cancelToken: text('cancel_token').notNull().unique(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('account_deletion_requests_user_id_idx').on(table.userId),
    index('account_deletion_requests_scheduled_for_idx').on(table.scheduledFor),
  ],
)

export type AccountDeletionRequest = InferSelectModel<typeof accountDeletionRequests>
export type NewAccountDeletionRequest = InferInsertModel<typeof accountDeletionRequests>
