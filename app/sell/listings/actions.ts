'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { eq, and, count, desc, asc, not, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import {
  listings,
  listingImages,
  sellerProfiles,
  profiles,
  auditLog,
  categories,
} from '@/db/schema'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// ---- Validation ----

const tagSchema = z
  .string()
  .min(1)
  .max(30, 'Tag trop long (max 30 chars)')
  .regex(/^[\w\-\s]+$/u, 'Tags alphanumériques uniquement')

const imageEntrySchema = z.object({
  url: z
    .string()
    .url('URL image invalide')
    .refine((url) => {
      try {
        const { hostname } = new URL(url)
        return hostname === 'res.cloudinary.com' || hostname.endsWith('.supabase.co')
      } catch {
        return false
      }
    }, 'URL image doit provenir de Cloudinary ou Supabase'),
  altText: z.string().max(200).default(''),
})

const listingSchema = z.object({
  title: z
    .string()
    .min(3, 'Titre trop court (min 3 chars)')
    .max(120, 'Titre trop long (max 120 chars)')
    .trim(),
  categoryId: z.string().uuid('Catégorie invalide').optional().nullable(),
  isQuoteOnly: z.boolean().default(false),
  priceCents: z.number().int().nonnegative().max(100_000_000).nullable().optional(),
  description: z.string().max(5000, 'Description trop longue (max 5000 chars)').trim(),
  tags: z.array(tagSchema).max(10, 'Maximum 10 tags').default([]),
  images: z.array(imageEntrySchema).max(8, 'Maximum 8 images').default([]),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
})

export type ListingInput = z.input<typeof listingSchema>
type ActionResult<T = void> = { error: string } | { success: true; data?: T }

// ---- Helpers ----

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function uniqueSlug(sellerId: string, base: string, excludeId?: string): Promise<string> {
  let slug = base || 'listing'
  let i = 1
  for (;;) {
    const conditions = [eq(listings.sellerId, sellerId), eq(listings.slug, slug)]
    if (excludeId) conditions.push(not(eq(listings.id, excludeId)))
    const existing = await db
      .select({ id: listings.id })
      .from(listings)
      .where(and(...conditions))
      .limit(1)
    if (!existing.at(0)) return slug
    slug = `${base}-${i++}`
  }
}

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
    return { user: null as never, error: 'Adhésion vérifiée requise.' }
  }
  return { user, error: null as null }
}

async function getSellerForUser(userId: string) {
  const rows = await db
    .select()
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, userId))
    .limit(1)
  return rows.at(0) ?? null
}

async function syncImages(listingId: string, images: Array<{ url: string; altText: string }>) {
  await db.delete(listingImages).where(eq(listingImages.listingId, listingId))
  if (images.length > 0) {
    await db.insert(listingImages).values(
      images.map((img, i) => ({
        listingId,
        url: img.url,
        altText: img.altText || null,
        sortOrder: i,
      })),
    )
  }
}

// ---- Actions ----

export async function createListing(data: ListingInput): Promise<ActionResult<{ id: string }>> {
  const { user, error } = await getVerifiedUser()
  if (error || !user) return { error: error ?? 'Non autorisé' }

  const seller = await getSellerForUser(user.id)
  if (!seller) return { error: 'Profil vendeur introuvable' }

  const rl = await checkRateLimit('listingCreate', user.id)
  if (!rl.success) return { error: 'Trop de listings créés — réessayez dans une heure' }

  if (data.status === 'active') {
    const [activeRow] = await db
      .select({ count: count() })
      .from(listings)
      .where(and(eq(listings.sellerId, seller.id), eq(listings.status, 'active')))
    if ((activeRow?.count ?? 0) >= 50) {
      return { error: 'Limite de 50 listings actifs atteinte — contactez le support' }
    }
  }

  const parsed = listingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }

  const d = parsed.data

  if (d.categoryId) {
    const catRow = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, d.categoryId))
      .limit(1)
    if (!catRow.at(0)) return { error: 'Catégorie introuvable' }
  }

  const slug = await uniqueSlug(seller.id, slugify(d.title))

  try {
    const [inserted] = await db
      .insert(listings)
      .values({
        sellerId: seller.id,
        title: d.title,
        slug,
        description: d.description,
        priceCents: d.isQuoteOnly ? null : (d.priceCents ?? null),
        isQuoteOnly: d.isQuoteOnly,
        tags: d.tags,
        images: d.images.map((img) => img.url),
        status: d.status,
      })
      .returning({ id: listings.id })

    if (!inserted) return { error: 'Erreur lors de la création du listing' }

    await syncImages(inserted.id, d.images)

    await db.insert(auditLog).values({
      actorId: user.id,
      action: 'listing.create',
      targetType: 'listing',
      targetId: inserted.id,
      metadata: { title: d.title, status: d.status },
    })

    logger.info({ userId: user.id, listingId: inserted.id }, '[listings] Listing créé')
    return { success: true, data: { id: inserted.id } }
  } catch (err) {
    logger.error({ err, userId: user.id }, '[listings] Erreur création listing')
    return { error: 'Erreur serveur — réessayez dans un instant' }
  }
}

export async function updateListing(
  id: string,
  data: Partial<ListingInput>,
): Promise<ActionResult> {
  const { user, error } = await getVerifiedUser()
  if (error || !user) return { error: error ?? 'Non autorisé' }

  const rl = await checkRateLimit('listingUpdate', user.id)
  if (!rl.success) return { error: 'Trop de modifications — réessayez dans une heure' }

  const seller = await getSellerForUser(user.id)
  if (!seller) return { error: 'Profil vendeur introuvable' }

  const listingRows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.sellerId, seller.id)))
    .limit(1)
  const listing = listingRows.at(0)
  if (!listing) return { error: 'Listing introuvable' }
  if (listing.status === 'removed') return { error: 'Ce listing a été supprimé' }

  const updateData: Partial<{
    title: string
    slug: string
    description: string
    priceCents: number | null
    isQuoteOnly: boolean
    tags: string[]
    images: string[]
    status: 'draft' | 'active' | 'paused'
    updatedAt: Date
  }> = { updatedAt: new Date() }

  if (data.title !== undefined) {
    const trimmed = data.title.trim().slice(0, 120)
    updateData.title = trimmed
    if (trimmed !== listing.title) {
      updateData.slug = await uniqueSlug(seller.id, slugify(trimmed), id)
    }
  }
  if (data.description !== undefined) updateData.description = data.description.trim()
  if (data.isQuoteOnly !== undefined) {
    updateData.isQuoteOnly = data.isQuoteOnly
    if (data.isQuoteOnly) updateData.priceCents = null
  }
  if (data.priceCents !== undefined && !updateData.isQuoteOnly) {
    updateData.priceCents = data.priceCents
  }
  if (data.tags !== undefined) updateData.tags = data.tags.slice(0, 10)
  if (data.images !== undefined) {
    updateData.images = data.images.slice(0, 8).map((img) => img.url)
  }
  if (data.status !== undefined) updateData.status = data.status

  await db.update(listings).set(updateData).where(eq(listings.id, id))

  if (data.images !== undefined) {
    await syncImages(
      id,
      data.images.slice(0, 8).map((img) => ({ url: img.url, altText: img.altText ?? '' })),
    )
  }

  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'listing.update',
    targetType: 'listing',
    targetId: id,
    metadata: { changes: Object.keys(updateData).filter((k) => k !== 'updatedAt') },
  })

  logger.info({ userId: user.id, listingId: id }, '[listings] Listing modifié')
  return { success: true }
}

export async function deleteListing(id: string): Promise<ActionResult> {
  const { user, error } = await getVerifiedUser()
  if (error || !user) return { error: error ?? 'Non autorisé' }

  const seller = await getSellerForUser(user.id)
  if (!seller) return { error: 'Profil vendeur introuvable' }

  const listingRows = await db
    .select({ id: listings.id, status: listings.status, title: listings.title })
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.sellerId, seller.id)))
    .limit(1)
  const listing = listingRows.at(0)
  if (!listing) return { error: 'Listing introuvable' }
  if (listing.status === 'removed') return { error: 'Déjà supprimé' }

  await db
    .update(listings)
    .set({ status: 'removed', updatedAt: new Date() })
    .where(eq(listings.id, id))

  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'listing.delete',
    targetType: 'listing',
    targetId: id,
    metadata: { title: listing.title, previousStatus: listing.status },
  })

  logger.info({ userId: user.id, listingId: id }, '[listings] Listing supprimé (soft)')
  return { success: true }
}

// ---- Queries (called from server components) ----

export type ListingFilter = {
  status?: 'all' | 'active' | 'draft' | 'paused' | 'removed'
  search?: string
  sortBy?: 'created' | 'updated' | 'title'
  sortDir?: 'asc' | 'desc'
  page?: number
  perPage?: number
}

export async function getSellerListingsForPage(userId: string, filter: ListingFilter = {}) {
  const seller = await getSellerForUser(userId)
  if (!seller) return { rows: [], total: 0, sellerId: null as string | null }

  const {
    status = 'all',
    search,
    sortBy = 'created',
    sortDir = 'desc',
    page = 1,
    perPage = 20,
  } = filter

  const conditions = [eq(listings.sellerId, seller.id)]
  if (status !== 'all') conditions.push(eq(listings.status, status))
  if (search) conditions.push(sql`${listings.title} ilike ${'%' + search + '%'}`)

  const orderCol =
    sortBy === 'title'
      ? listings.title
      : sortBy === 'updated'
        ? listings.updatedAt
        : listings.createdAt
  const order = sortDir === 'asc' ? asc(orderCol) : desc(orderCol)

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(listings)
      .where(and(...conditions))
      .orderBy(order)
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ count: count() })
      .from(listings)
      .where(and(...conditions)),
  ])

  return { rows, total: countResult.at(0)?.count ?? 0, sellerId: seller.id }
}

export async function getListingForEdit(listingId: string, userId: string) {
  const seller = await getSellerForUser(userId)
  if (!seller) return null

  const listingRows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.sellerId, seller.id)))
    .limit(1)
  const listing = listingRows.at(0)
  if (!listing || listing.status === 'removed') return null

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(asc(listingImages.sortOrder))

  return { listing, images }
}
