import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { categories, sellerProfiles, listings, sellerReviews } from '@/db/schema'
import { HeroSearch } from './hero-search'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'ADDMarket — Marketplace Assemblées de Dieu France',
  description:
    'Trouvez des produits et services proposés par des membres vérifiés des Assemblées de Dieu France.',
}

async function getHomeData() {
  const [topCategories, featuredSellers, recentListings] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.sortOrder)
      .limit(8),
    db
      .select({
        id: sellerProfiles.id,
        slug: sellerProfiles.slug,
        businessName: sellerProfiles.businessName,
        description: sellerProfiles.description,
        logoUrl: sellerProfiles.logoUrl,
        avgRating: sql<number>`avg(${sellerReviews.rating})::numeric(3,2)`,
        reviewCount: sql<number>`count(${sellerReviews.id})::int`,
      })
      .from(sellerProfiles)
      .leftJoin(
        sellerReviews,
        and(eq(sellerReviews.sellerId, sellerProfiles.id), eq(sellerReviews.status, 'published')),
      )
      .where(eq(sellerProfiles.isActive, true))
      .groupBy(sellerProfiles.id)
      .orderBy(sql`count(${sellerReviews.id}) DESC`)
      .limit(6),
    db
      .select({
        id: listings.id,
        title: listings.title,
        slug: listings.slug,
        priceCents: listings.priceCents,
        isQuoteOnly: listings.isQuoteOnly,
        images: listings.images,
        sellerName: sellerProfiles.businessName,
        sellerSlug: sellerProfiles.slug,
      })
      .from(listings)
      .leftJoin(sellerProfiles, eq(listings.sellerId, sellerProfiles.id))
      .where(eq(listings.status, 'active'))
      .orderBy(desc(listings.publishedAt))
      .limit(8),
  ])

  return { topCategories, featuredSellers, recentListings }
}

export default async function HomePage() {
  const { topCategories, featuredSellers, recentListings } = await getHomeData()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-500 px-4 py-16 text-center text-white">
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">ADDMarket</h1>
        <p className="mb-8 text-blue-100">
          La marketplace de la communauté Assemblées de Dieu France
        </p>
        <div className="mx-auto max-w-xl">
          <HeroSearch />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        {/* Categories */}
        {topCategories.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-bold text-gray-900">Catégories populaires</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
              {topCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/search?category=${cat.id}`}
                  className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 text-center transition-shadow hover:shadow-md"
                >
                  {cat.icon && <span className="mb-2 text-2xl">{cat.icon}</span>}
                  <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured sellers */}
        {featuredSellers.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Vendeurs bien notés</h2>
              <Link href="/sellers" className="text-sm text-blue-600 hover:underline">
                Voir tous →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {featuredSellers.map((seller) => (
                <Link
                  key={seller.id}
                  href={`/sellers/${seller.slug ?? seller.id}`}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  {seller.logoUrl ? (
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={seller.logoUrl}
                        alt={seller.businessName}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                      {seller.businessName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{seller.businessName}</p>
                    {seller.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                        {seller.description}
                      </p>
                    )}
                    {seller.reviewCount > 0 && (
                      <p className="mt-1 text-xs text-amber-500">
                        {'★'.repeat(Math.round(Number(seller.avgRating)))}
                        {'☆'.repeat(5 - Math.round(Number(seller.avgRating)))}
                        <span className="ml-1 text-gray-400">({seller.reviewCount})</span>
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent listings */}
        {recentListings.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Dernières offres</h2>
              <Link href="/search?sort=newest" className="text-sm text-blue-600 hover:underline">
                Voir toutes →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {recentListings.map((item) => (
                <Link
                  key={item.id}
                  href={`/listings/${item.slug ?? item.id}`}
                  className="group rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
                >
                  <div className="relative mb-2 h-36 overflow-hidden rounded-lg bg-gray-100">
                    {item.images[0] ? (
                      <Image
                        src={item.images[0]}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 25vw"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl text-gray-300">
                        🛍️
                      </div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {item.isQuoteOnly
                      ? 'Sur devis'
                      : item.priceCents != null
                        ? `${(item.priceCents / 100).toFixed(2)} €`
                        : ''}
                  </p>
                  {item.sellerName && (
                    <p className="mt-0.5 truncate text-xs text-gray-400">{item.sellerName}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA for non-sellers */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 px-8 py-10 text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Vous êtes membre d&apos;une Assemblée de Dieu ?
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Proposez vos services et produits à la communauté en quelques minutes.
          </p>
          <Link
            href="/sell/onboarding"
            className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Devenir vendeur →
          </Link>
        </section>
      </div>
    </main>
  )
}
