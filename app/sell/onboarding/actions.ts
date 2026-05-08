'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'
import { eq, not, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles, profiles, categories, auditLog } from '@/db/schema'
import { logger } from '@/lib/logger'
import { slugify } from '@/lib/slug'
import { checkRateLimit } from '@/lib/rate-limit'
import { geocodeCity } from '@/lib/geocoding'
import { sql } from 'drizzle-orm'

// ---- Zod schemas for each step ----

export const step1Schema = z.object({
  businessName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(80, 'Le nom ne peut pas dépasser 80 caractères')
    .trim(),
  categoryId: z.string().uuid('Catégorie invalide'),
})

export const step2Schema = z.object({
  description: z
    .string()
    .min(20, 'La description doit contenir au moins 20 caractères')
    .max(2000, 'La description ne peut pas dépasser 2000 caractères')
    .trim(),
})

export const step3Schema = z.object({
  serviceCities: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(
      z.array(z.string().min(1)).min(1, 'Indiquez au moins une ville').max(10, 'Maximum 10 villes'),
    ),
  serviceAreaKm: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(500))
    .optional()
    .default('30'),
})

export const step4Schema = z.object({
  contactPhone: z
    .string()
    .optional()
    .refine(
      (v) => !v || isValidPhoneNumber(v, 'FR'),
      'Numéro de téléphone invalide (format international recommandé)',
    )
    .transform((v) => {
      if (!v) return undefined
      try {
        return parsePhoneNumber(v, 'FR').format('E.164')
      } catch {
        return v
      }
    }),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  contactWhatsapp: z
    .string()
    .optional()
    .refine((v) => !v || isValidPhoneNumber(v, 'FR'), 'Numéro WhatsApp invalide')
    .transform((v) => {
      if (!v) return undefined
      try {
        return parsePhoneNumber(v, 'FR').format('E.164')
      } catch {
        return v
      }
    }),
  instagram: z.string().url('URL invalide').optional().or(z.literal('')),
  facebook: z.string().url('URL invalide').optional().or(z.literal('')),
  website: z.string().url('URL invalide').optional().or(z.literal('')),
})

const dayHoursSchema = z
  .object({
    open: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  })
  .nullable()
  .optional()

export const step5Schema = z.object({
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
  sun: dayHoursSchema,
})

export const step6Schema = z.object({
  logoUrl: z.string().url('URL logo invalide').optional().or(z.literal('')),
  coverUrl: z.string().url('URL cover invalide').optional().or(z.literal('')),
})

// ---- Full profile schema (publish) ----
const fullProfileSchema = step1Schema.merge(step2Schema).merge(
  z.object({
    serviceCities: z.array(z.string()),
    serviceAreaKm: z.number().int().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().optional(),
    contactWhatsapp: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    website: z.string().optional(),
    openingHours: z.record(z.any()).optional(),
    logoUrl: z.string().optional(),
    coverUrl: z.string().optional(),
  }),
)

type FullProfile = z.infer<typeof fullProfileSchema>

type ActionResult<T = void> = { error: string } | { success: true; data?: T }

async function uniqueSellerSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'vendeur'
  let i = 1
  for (;;) {
    const conditions = [eq(sellerProfiles.slug, slug)]
    if (excludeId) conditions.push(not(eq(sellerProfiles.id, excludeId)))
    const existing = await db
      .select({ id: sellerProfiles.id })
      .from(sellerProfiles)
      .where(and(...conditions))
      .limit(1)
    if (!existing.at(0)) return slug
    slug = `${base}-${i++}`
  }
}

// ---- Server Actions ----

async function getVerifiedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profileRows = await db
    .select({ membershipStatus: profiles.membershipStatus })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  const profile = profileRows.at(0)
  if (!profile || profile.membershipStatus !== 'verified') {
    return { user: null, error: 'Votre adhésion doit être vérifiée pour devenir vendeur.' }
  }
  return { user, error: null }
}

export async function publishSellerProfile(
  data: FullProfile,
): Promise<ActionResult<{ sellerId: string }>> {
  const { user, error } = await getVerifiedUser()
  if (error || !user) return { error: error ?? 'Non autorisé' }

  const parsed = fullProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const d = parsed.data

  // Validate category exists
  const catRows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, d.categoryId))
    .limit(1)
  if (!catRows.at(0)) return { error: 'Catégorie introuvable' }

  const socialLinks = {
    ...(d.instagram ? { instagram: d.instagram } : {}),
    ...(d.facebook ? { facebook: d.facebook } : {}),
    ...(d.website ? { website: d.website } : {}),
  }

  const openingHours = d.openingHours ?? {}
  const slug = await uniqueSellerSlug(slugify(d.businessName))

  // Geocode first city for the PostGIS service_location point
  const firstCity = d.serviceCities.at(0)
  const geo = firstCity ? await geocodeCity(firstCity) : null
  const serviceLocationWkt = geo ? `POINT(${geo.lng} ${geo.lat})` : null

  try {
    const [inserted] = await db
      .insert(sellerProfiles)
      .values({
        userId: user.id,
        slug,
        businessName: d.businessName,
        description: d.description,
        categoryId: d.categoryId,
        serviceCities: d.serviceCities,
        ...(serviceLocationWkt
          ? { serviceLocation: sql`ST_GeogFromText(${serviceLocationWkt})` }
          : {}),
        serviceAreaKm: d.serviceAreaKm ?? 30,
        contactPhone: d.contactPhone ?? null,
        contactEmail: d.contactEmail || null,
        contactWhatsapp: d.contactWhatsapp ?? null,
        socialLinks,
        openingHours: Object.keys(openingHours).length > 0 ? openingHours : null,
        logoUrl: d.logoUrl || null,
        coverUrl: d.coverUrl || null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: sellerProfiles.userId,
        set: {
          businessName: d.businessName,
          description: d.description,
          categoryId: d.categoryId,
          serviceCities: d.serviceCities,
          ...(serviceLocationWkt
            ? { serviceLocation: sql`ST_GeogFromText(${serviceLocationWkt})` }
            : {}),
          serviceAreaKm: d.serviceAreaKm ?? 30,
          contactPhone: d.contactPhone ?? null,
          contactEmail: d.contactEmail || null,
          contactWhatsapp: d.contactWhatsapp ?? null,
          socialLinks,
          openingHours: Object.keys(openingHours).length > 0 ? openingHours : null,
          logoUrl: d.logoUrl || null,
          coverUrl: d.coverUrl || null,
          isActive: true,
        },
      })
      .returning({ id: sellerProfiles.id })

    if (!inserted) return { error: 'Erreur lors de la création du profil vendeur' }

    logger.info({ userId: user.id, sellerId: inserted.id }, '[sell] Profil vendeur publié')
    return { success: true, data: { sellerId: inserted.id } }
  } catch (err) {
    logger.error({ err, userId: user.id }, '[sell] Erreur publication profil vendeur')
    return { error: 'Erreur serveur — réessayez dans un instant' }
  }
}

export async function updateSellerProfile(data: Partial<FullProfile>): Promise<ActionResult> {
  const { user, error } = await getVerifiedUser()
  if (error || !user) return { error: error ?? 'Non autorisé' }

  const rl = await checkRateLimit('profileUpdate', user.id)
  if (!rl.success) return { error: 'Trop de modifications — réessayez dans une heure' }

  const existing = await db
    .select({ id: sellerProfiles.id })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, user.id))
    .limit(1)

  const row = existing.at(0)
  if (!row) return { error: 'Profil vendeur introuvable' }

  const socialLinks: Record<string, string> = {}
  if (data.instagram) socialLinks.instagram = data.instagram
  if (data.facebook) socialLinks.facebook = data.facebook
  if (data.website) socialLinks.website = data.website

  // Geocode first service city for PostGIS point (server-side, token never exposed)
  let serviceLocationWkt: string | undefined
  if (data.serviceCities && data.serviceCities.length > 0) {
    const firstCity = data.serviceCities[0]
    if (firstCity) {
      const geo = await geocodeCity(firstCity)
      if (geo) {
        // WKT POINT(lng lat) — PostGIS expects longitude first
        serviceLocationWkt = `POINT(${geo.lng} ${geo.lat})`
      }
    }
  }

  await db
    .update(sellerProfiles)
    .set({
      ...(data.businessName ? { businessName: data.businessName } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.categoryId ? { categoryId: data.categoryId } : {}),
      ...(data.serviceCities ? { serviceCities: data.serviceCities } : {}),
      ...(serviceLocationWkt
        ? { serviceLocation: sql`ST_GeogFromText(${serviceLocationWkt})` }
        : {}),
      ...(data.serviceAreaKm !== undefined ? { serviceAreaKm: data.serviceAreaKm } : {}),
      ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone ?? null } : {}),
      ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail || null } : {}),
      ...(data.contactWhatsapp !== undefined
        ? { contactWhatsapp: data.contactWhatsapp ?? null }
        : {}),
      ...(Object.keys(socialLinks).length > 0 ? { socialLinks } : {}),
      ...(data.openingHours !== undefined ? { openingHours: data.openingHours } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
      ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl || null } : {}),
    })
    .where(eq(sellerProfiles.id, row.id))

  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'seller.update',
    targetType: 'seller',
    targetId: row.id,
    metadata: {
      fields: Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined),
    },
  })

  return { success: true }
}
