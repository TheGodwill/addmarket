import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { sellerProfiles, categories, sellerReviews } from '@/db/schema'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Vendeurs — ADDMarket',
  description: 'Découvrez les vendeurs vérifiés de la communauté Assemblées de Dieu France.',
}

export default async function SellersPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; page?: string }>
}) {
  const sp = await searchParams
  const catFilter = sp.cat
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const limit = 24
  const offset = (page - 1) * limit

  const [allCategories, rows, countRow] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.sortOrder),
    db
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
          ...(catFilter ? [eq(sellerProfiles.categoryId, catFilter)] : []),
        ),
      )
      .groupBy(sellerProfiles.id, categories.name)
      .orderBy(desc(sql`count(${sellerReviews.id})`))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sellerProfiles)
      .where(
        and(
          eq(sellerProfiles.isActive, true),
          ...(catFilter ? [eq(sellerProfiles.categoryId, catFilter)] : []),
        ),
      ),
  ])

  const total = countRow.at(0)?.count ?? 0
  const totalPages = Math.ceil(total / limit)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Vendeurs ({total})</h1>
          <Link href="/explore" className="text-sm text-blue-600 hover:underline">
            Voir sur la carte →
          </Link>
        </div>

        {/* Category filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/sellers"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !catFilter
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tous
          </Link>
          {allCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/sellers?cat=${cat.id}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                catFilter === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            Aucun vendeur dans cette catégorie.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {rows.map((seller) => (
              <Link
                key={seller.id}
                href={`/sellers/${seller.slug ?? seller.id}`}
                className="group rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3">
                  {seller.logoUrl ? (
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={seller.logoUrl}
                        alt={seller.businessName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                      {seller.businessName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 group-hover:text-blue-600">
                      {seller.businessName}
                    </p>
                    {seller.categoryName && (
                      <p className="truncate text-xs text-gray-400">{seller.categoryName}</p>
                    )}
                  </div>
                </div>

                {seller.description && (
                  <p className="mb-2 line-clamp-2 text-xs text-gray-500">{seller.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400">
                  {seller.reviewCount > 0 ? (
                    <span className="text-amber-500">
                      {'★'.repeat(Math.round(Number(seller.avgRating)))}
                      {'☆'.repeat(5 - Math.round(Number(seller.avgRating)))}
                      <span className="ml-1 text-gray-400">({seller.reviewCount})</span>
                    </span>
                  ) : (
                    <span>Nouveau vendeur</span>
                  )}
                  {seller.serviceCities.length > 0 && (
                    <span className="truncate">{seller.serviceCities[0]}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4 text-sm">
            {page > 1 && (
              <Link
                href={`/sellers?${catFilter ? `cat=${catFilter}&` : ''}page=${page - 1}`}
                className="text-blue-600 hover:underline"
              >
                ← Précédent
              </Link>
            )}
            <span className="text-gray-500">
              Page {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/sellers?${catFilter ? `cat=${catFilter}&` : ''}page=${page + 1}`}
                className="text-blue-600 hover:underline"
              >
                Suivant →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
