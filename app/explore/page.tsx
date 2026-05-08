import type { Metadata } from 'next'
import { eq, and, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { sellerProfiles, categories, sellerReviews } from '@/db/schema'
import { ExploreMap } from './explore-map'
import { ExploreList } from './explore-list'

export const metadata: Metadata = {
  title: 'Explorer — ADDMarket',
  description: 'Trouvez des vendeurs autour de vous sur la carte.',
}

export const revalidate = 300

export interface SellerMapPin {
  id: string
  slug: string | null
  businessName: string
  description: string | null
  logoUrl: string | null
  categoryName: string | null
  serviceCities: string[]
  avgRating: number | null
  reviewCount: number
  // Approximate lat/lng — blurred ±500m for privacy (city-level only)
  lat: number
  lng: number
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; cat?: string }>
}) {
  const sp = await searchParams
  const view = sp.view === 'list' ? 'list' : 'map'
  const catFilter = sp.cat

  // Fetch sellers that have a service_location set
  const rows = await db
    .select({
      id: sellerProfiles.id,
      slug: sellerProfiles.slug,
      businessName: sellerProfiles.businessName,
      description: sellerProfiles.description,
      logoUrl: sellerProfiles.logoUrl,
      serviceCities: sellerProfiles.serviceCities,
      categoryName: categories.name,
      avgRating: sql<number>`avg(${sellerReviews.rating})::numeric(3,2)`,
      reviewCount: sql<number>`count(${sellerReviews.id})::int`,
      // Extract lat/lng from PostGIS point, blurred by ~500m
      lat: sql<number>`round((ST_Y(service_location::geometry) + (random()-0.5)*0.009)::numeric, 4)`,
      lng: sql<number>`round((ST_X(service_location::geometry) + (random()-0.5)*0.009)::numeric, 4)`,
    })
    .from(sellerProfiles)
    .leftJoin(categories, eq(sellerProfiles.categoryId, categories.id))
    .leftJoin(
      sellerReviews,
      and(eq(sellerReviews.sellerId, sellerProfiles.id), eq(sellerReviews.status, 'published')),
    )
    .where(
      and(
        eq(sellerProfiles.isActive, true),
        isNotNull(sellerProfiles.serviceLocation),
        ...(catFilter ? [eq(sellerProfiles.categoryId, catFilter)] : []),
      ),
    )
    .groupBy(sellerProfiles.id, categories.name)

  const pins: SellerMapPin[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    businessName: r.businessName,
    description: r.description,
    logoUrl: r.logoUrl,
    categoryName: r.categoryName ?? null,
    serviceCities: r.serviceCities ?? [],
    avgRating: r.avgRating ?? null,
    reviewCount: r.reviewCount,
    lat: Number(r.lat),
    lng: Number(r.lng),
  }))

  return (
    <main className="flex h-[calc(100vh-64px)] flex-col">
      {/* Toggle + count bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <p className="text-sm text-gray-500">
          {pins.length} vendeur{pins.length !== 1 ? 's' : ''}
        </p>
        <div className="flex overflow-hidden rounded-lg border border-gray-200">
          <a
            href={`/explore?${catFilter ? `cat=${catFilter}&` : ''}view=map`}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${
              view === 'map' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Carte
          </a>
          <a
            href={`/explore?${catFilter ? `cat=${catFilter}&` : ''}view=list`}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${
              view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Liste
          </a>
        </div>
      </div>

      {view === 'list' ? <ExploreList pins={pins} /> : <ExploreMap pins={pins} />}
    </main>
  )
}
