import { index, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { churches } from './churches'

export const referentRoleEnum = pgEnum('referent_role', ['referent', 'admin_local'])

export const churchReferents = pgTable(
  'church_referents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id, { onDelete: 'cascade' }),
    // FK to auth.users(id) ON DELETE CASCADE — added in SQL migration
    userId: uuid('user_id').notNull(),
    role: referentRoleEnum('role').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    // FK to auth.users(id) — added in SQL migration
    grantedBy: uuid('granted_by'),
  },
  (table) => [
    unique('church_referents_church_user_unique').on(table.churchId, table.userId),
    index('church_referents_user_id_idx').on(table.userId),
  ],
)

export type ChurchReferent = InferSelectModel<typeof churchReferents>
export type NewChurchReferent = InferInsertModel<typeof churchReferents>
