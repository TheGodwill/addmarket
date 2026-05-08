import { boolean, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id'),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [index('categories_parent_id_idx').on(table.parentId)],
)

export type Category = InferSelectModel<typeof categories>
export type NewCategory = InferInsertModel<typeof categories>
