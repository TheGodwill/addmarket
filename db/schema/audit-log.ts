import { customType, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

const inet = customType<{ data: string }>({
  dataType() {
    return 'inet'
  },
})

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // FK to auth.users(id) SET NULL — added in SQL migration. Nullable: system actions have no actor.
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    // Immutable — UPDATE/DELETE blocked by trigger in SQL migration
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_log_actor_id_idx').on(table.actorId),
    index('audit_log_created_at_idx').on(table.createdAt),
    index('audit_log_action_idx').on(table.action),
    index('audit_log_target_idx').on(table.targetType, table.targetId),
  ],
)

export type AuditLog = InferSelectModel<typeof auditLog>
export type NewAuditLog = InferInsertModel<typeof auditLog>
