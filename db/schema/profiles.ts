import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { churches } from './churches'

export const membershipStatusEnum = pgEnum('membership_status', [
  'pending',
  'verified',
  'expired',
  'rejected',
  'suspended',
])

export const profiles = pgTable(
  'profiles',
  {
    // FK to auth.users(id) ON DELETE CASCADE — added in SQL migration (cross-schema)
    id: uuid('id').primaryKey(),
    displayName: text('display_name').notNull(),
    // AES-256-GCM encrypted — see lib/phone-crypto.ts
    phoneEncrypted: text('phone_encrypted'),
    city: text('city'),
    region: text('region'),
    churchId: uuid('church_id').references(() => churches.id, { onDelete: 'set null' }),
    membershipStatus: membershipStatusEnum('membership_status').notNull().default('pending'),
    // Argon2id hash — see lib/crypto.ts. Never store plaintext.
    membershipCardHash: text('membership_card_hash'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    // FK to auth.users(id) — added in SQL migration
    verifiedBy: uuid('verified_by'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    // MFA — Supabase factor ID stored for quick challenge lookup
    mfaEnabledAt: timestamp('mfa_enabled_at', { withTimezone: true }),
    mfaFactorId: text('mfa_factor_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('profiles_church_id_idx').on(table.churchId),
    index('profiles_membership_status_idx').on(table.membershipStatus),
  ],
)

export type Profile = InferSelectModel<typeof profiles>
export type NewProfile = InferInsertModel<typeof profiles>
