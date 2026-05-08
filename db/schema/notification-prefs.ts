import { boolean, index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { profiles } from './profiles'

export const notifTypeEnum = pgEnum('notif_type', [
  'new_message',
  'new_review',
  'review_response',
  'verification_update',
])

export const notifChannelEnum = pgEnum('notif_channel', ['email'])

export const notificationPrefs = pgTable(
  'notification_prefs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    type: notifTypeEnum('type').notNull(),
    channel: notifChannelEnum('channel').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_prefs_user_type_channel_unique').on(
      table.userId,
      table.type,
      table.channel,
    ),
    index('notification_prefs_user_id_idx').on(table.userId),
  ],
)

export type NotificationPref = InferSelectModel<typeof notificationPrefs>
export type NewNotificationPref = InferInsertModel<typeof notificationPrefs>
