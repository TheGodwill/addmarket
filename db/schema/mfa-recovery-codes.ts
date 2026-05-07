import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const mfaRecoveryCodes = pgTable('mfa_recovery_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  // FK to auth.users(id) ON DELETE CASCADE — added in SQL migration
  userId: uuid('user_id').notNull(),
  codeHash: text('code_hash').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type MfaRecoveryCode = InferSelectModel<typeof mfaRecoveryCodes>
export type NewMfaRecoveryCode = InferInsertModel<typeof mfaRecoveryCodes>
