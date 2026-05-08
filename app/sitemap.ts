import type { MetadataRoute } from 'next'
import { db } from '@/db/client'
import { sellerProfiles, listings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { clientEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'

  const [sellers, activeListings] = await Promise.all([
    db
      .select({ slug: sellerProfiles.slug, updatedAt: sellerProfiles.updatedAt })
      .from(sellerProfiles)
      .where(eq(sellerProfiles.isActive, true)),
    db
      .select({ id: listings.id, updatedAt: listings.updatedAt })
      .from(listings)
      .where(eq(listings.status, 'active')),
  ])

  return [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...sellers
      .filter((s) => s.slug)
      .map((s) => ({
        url: `${baseUrl}/sellers/${s.slug}`,
        lastModified: s.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ...activeListings.map((l) => ({
      url: `${baseUrl}/listings/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
