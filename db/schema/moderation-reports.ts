import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { profiles } from './profiles'

export const reportTargetTypeEnum = pgEnum('report_target_type', ['listing', 'seller', 'review'])

export const reportStatusEnum = pgEnum('report_status', [
  'new',
  'in_review',
  'resolved',
  'rejected',
])

export const reportReasonEnum = pgEnum('report_reason_type', [
  'spam',
  'fake',
  'inappropriate',
  'illegal',
  'scam',
  'other',
])

export const sanctionTypeEnum = pgEnum('sanction_type', [
  'warning',
  'suspension',
  'ban',
  'unsuspension',
  'unban',
])

export const moderationReports = pgTable(
  'moderation_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Nullable: SET NULL on reporter account deletion (RGPD)
    reporterId: uuid('reporter_id').references(() => profiles.id, { onDelete: 'set null' }),
    targetType: reportTargetTypeEnum('target_type').notNull(),
    // UUID of listing/seller/review being reported
    targetId: uuid('target_id').notNull(),
    reason: reportReasonEnum('reason').notNull(),
    details: text('details'),
    status: reportStatusEnum('status').notNull().default('new'),
    // Auto-elevated to 'high' when 3+ independent reports on same target
    priority: text('priority').notNull().default('normal'),
    moderatorNote: text('moderator_note'),
    resolvedById: uuid('resolved_by_id').references(() => profiles.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('moderation_reports_target_idx').on(table.targetType, table.targetId),
    index('moderation_reports_reporter_idx').on(table.reporterId),
    index('moderation_reports_status_idx').on(table.status),
    index('moderation_reports_created_idx').on(table.createdAt),
  ],
)

export const accountSanctions = pgTable(
  'account_sanctions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    sanctionedById: uuid('sanctioned_by_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    type: sanctionTypeEnum('type').notNull(),
    reason: text('reason').notNull(),
    // null = permanent (for bans)
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('account_sanctions_user_id_idx').on(table.userId),
    index('account_sanctions_created_idx').on(table.createdAt),
  ],
)

export type ModerationReport = InferSelectModel<typeof moderationReports>
export type NewModerationReport = InferInsertModel<typeof moderationReports>
export type AccountSanction = InferSelectModel<typeof accountSanctions>
export type NewAccountSanction = InferInsertModel<typeof accountSanctions>
