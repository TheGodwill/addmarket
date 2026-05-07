import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { churches } from './churches'

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'waiting',
])

export const REJECTION_REASON_CODES = [
  'photo_illegible',
  'photo_missing',
  'card_expired',
  'not_member',
  'duplicate',
  'other',
] as const

export type RejectionReasonCode = (typeof REJECTION_REASON_CODES)[number]

export const REJECTION_REASON_LABELS: Record<RejectionReasonCode, string> = {
  photo_illegible: 'Photo illisible',
  photo_missing: 'Photo manquante',
  card_expired: 'Carte expirée',
  not_member: "Non-membre de l'église",
  duplicate: 'Demande en doublon',
  other: 'Autre',
}

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
    cardPhotoBackStoragePath: text('card_photo_back_storage_path'),
    cardNumberHash: text('card_number_hash'),
    cardNumberLast4: text('card_number_last4'),
    status: verificationStatusEnum('status').notNull().default('pending'),
    rejectionReasonCode: text('rejection_reason_code'),
    rejectionReason: text('rejection_reason'),
    resubmitAfter: timestamp('resubmit_after', { withTimezone: true }),
    submissionDisplayName: text('submission_display_name'),
    submissionCity: text('submission_city'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    // FK to auth.users(id) — added in SQL migration
    processedBy: uuid('processed_by'),
  },
  (table) => [
    index('verification_requests_user_id_idx').on(table.userId),
    index('verification_requests_church_id_idx').on(table.churchId),
    index('verification_requests_status_idx').on(table.status),
  ],
)

export type VerificationRequest = InferSelectModel<typeof verificationRequests>
export type NewVerificationRequest = InferInsertModel<typeof verificationRequests>
