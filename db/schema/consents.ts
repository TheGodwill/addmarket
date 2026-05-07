import { boolean, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const CONSENT_TYPES = ['analytics', 'marketing_emails'] as const
export type ConsentType = (typeof CONSENT_TYPES)[number]

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // FK to auth.users(id) ON DELETE CASCADE — added in SQL migration
    userId: uuid('user_id').notNull(),
    consentType: text('consent_type').notNull(),
    granted: boolean('granted').notNull().default(false),
    grantedAt: timestamp('granted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    // Incremented when the consent policy changes — invalidates old consents
    version: text('version').notNull().default('1'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('consents_user_consent_unique').on(table.userId, table.consentType),
    index('consents_user_id_idx').on(table.userId),
  ],
)

export type Consent = InferSelectModel<typeof consents>
export type NewConsent = InferInsertModel<typeof consents>
