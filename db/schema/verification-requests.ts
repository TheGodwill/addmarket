import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { churches } from './churches'

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

export const verificationRequests = pgTable(
  'verification_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // FK to auth.users(id) ON DELETE CASCADE — added in SQL migration
    userId: uuid('user_id').notNull(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id, { onDelete: 'restrict' }),
    cardPhotoStoragePath: text('card_photo_storage_path'),
    status: verificationStatusEnum('status').notNull().default('pending'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    // FK to auth.users(id) — added in SQL migration
    processedBy: uuid('processed_by'),
    rejectionReason: text('rejection_reason'),
  },
  (table) => [
    index('verification_requests_user_id_idx').on(table.userId),
    index('verification_requests_church_id_idx').on(table.churchId),
    index('verification_requests_status_idx').on(table.status),
  ],
)

export type VerificationRequest = InferSelectModel<typeof verificationRequests>
export type NewVerificationRequest = InferInsertModel<typeof verificationRequests>
