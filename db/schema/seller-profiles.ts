import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { profiles } from './profiles'
import { categories } from './categories'

// PostGIS GEOGRAPHY POINT — stored as WKT string, parsed via PostGIS functions
const geography = customType<{ data: string | null }>({
  dataType() {
    return 'geography(POINT, 4326)'
  },
})

export interface ServiceLocation {
  city: string
  region?: string
  lat?: number
  lng?: number
}

export interface OpeningHours {
  mon?: { open: string; close: string } | null
  tue?: { open: string; close: string } | null
  wed?: { open: string; close: string } | null
  thu?: { open: string; close: string } | null
  fri?: { open: string; close: string } | null
  sat?: { open: string; close: string } | null
  sun?: { open: string; close: string } | null
}

export interface SocialLinks {
  instagram?: string
  facebook?: string
  twitter?: string
  linkedin?: string
  youtube?: string
  tiktok?: string
  website?: string
}

export const sellerProfiles = pgTable(
  'seller_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    businessName: text('business_name').notNull(),
    description: text('description'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    serviceAreaKm: integer('service_area_km'),
    // Primary geography point (PostGIS) — center of service area
    serviceLocation: geography('service_location'),
    // Array of covered cities for display and text search
    serviceCities: text('service_cities').array().notNull().default([]),
    openingHours: jsonb('opening_hours').$type<OpeningHours>(),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    contactWhatsapp: text('contact_whatsapp'),
    socialLinks: jsonb('social_links').$type<SocialLinks>().notNull().default({}),
    logoUrl: text('logo_url'),
    coverUrl: text('cover_url'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('seller_profiles_category_id_idx').on(table.categoryId),
    index('seller_profiles_is_active_idx').on(table.isActive),
    uniqueIndex('seller_profiles_user_id_unique').on(table.userId),
  ],
)

export type SellerProfile = InferSelectModel<typeof sellerProfiles>
export type NewSellerProfile = InferInsertModel<typeof sellerProfiles>
