import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { categories } from '@/db/schema'
import { meiliSearch, LISTINGS_INDEX, SELLERS_INDEX } from '@/lib/meilisearch'
import type { ListingDocument, SellerDocument } from '@/lib/meilisearch'
import { SearchBar } from './search-bar'
import { SearchFilters } from './search-filters'

export const metadata: Metadata = {
  title: 'Recherche — ADDMarket',
  description: 'Trouvez des produits et services au sein de la communauté Assemblées de Dieu.',
}

const SORT_OPTIONS = {
  relevance: undefined,
  price_asc: 'priceCents:asc',
  price_desc: 'priceCents:desc',
  newest: 'publishedAt:desc',
} as const

const PER_PAGE = 24

interface SearchParams {
  q?: string
  category?: string
  city?: string
  price_min?: string
  price_max?: string
  sort?: string
  page?: string
  type?: string
}

function ResultSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-2 h-36 rounded-lg bg-gray-200" />
          <div className="mb-1 h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/2 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

async function SearchResults({
  q,
  category,
  city,
  priceMin,
  priceMax,
  sort,
  page,
}: {
  q: string
  category?: string
  city?: string
  priceMin?: number
  priceMax?: number
  sort: string
  page: number
}) {
  if (!meiliSearch) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        Moteur de recherche non configuré (environnement de développement).
      </div>
    )
  }

  const offset = (page - 1) * PER_PAGE
  const filters: string[] = ['status = "active"']
  if (category) filters.push(`categoryId = "${category}"`)
  if (city) filters.push(`serviceCities = "${city}"`)
  if (priceMin !== undefined) filters.push(`priceCents >= ${priceMin}`)
  if (priceMax !== undefined) filters.push(`priceCents <= ${priceMax}`)

  const sortValue =
    sort !== 'relevance' && sort in SORT_OPTIONS
      ? SORT_OPTIONS[sort as keyof typeof SORT_OPTIONS]
      : undefined
  const sortBy = sortValue ? [sortValue] : []

  const results = await meiliSearch.index(LISTINGS_INDEX).search<ListingDocument>(q, {
    filter: filters.join(' AND '),
    sort: sortBy,
    offset,
    limit: PER_PAGE,
    attributesToHighlight: ['title'],
    highlightPreTag: '<mark class="bg-yellow-100 not-italic">',
    highlightPostTag: '</mark>',
  })

  const totalPages = Math.ceil((results.estimatedTotalHits ?? 0) / PER_PAGE)

  if (results.hits.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-gray-700">Aucun résultat</p>
        {q && (
          <p className="mt-2 text-sm text-gray-400">
            Essayez avec d&apos;autres mots-clés ou supprimez certains filtres.
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="mb-4 text-sm text-gray-500">
        {results.estimatedTotalHits} résultat{(results.estimatedTotalHits ?? 0) > 1 ? 's' : ''} en{' '}
        {results.processingTimeMs} ms
      </p>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {results.hits.map((hit) => (
          <Link
            key={hit.id}
            href={`/listings/${hit.slug ?? hit.id}`}
            className="group rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
          >
            <div className="relative mb-2 h-36 overflow-hidden rounded-lg bg-gray-100">
              {hit.images[0] ? (
                <Image
                  src={hit.images[0]}
                  alt={hit.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl text-gray-300">
                  🛍️
                </div>
              )}
            </div>
            <p
              className="line-clamp-2 text-sm font-medium text-gray-900"
              dangerouslySetInnerHTML={{
                __html:
                  (hit as unknown as { _formatted?: { title?: string } })._formatted?.title ??
                  hit.title,
              }}
            />
            <p className="mt-1 text-sm font-semibold text-blue-700">
              {hit.isQuoteOnly
                ? 'Sur devis'
                : hit.priceCents != null
                  ? `${(hit.priceCents / 100).toFixed(2)} €`
                  : ''}
            </p>
            {hit.sellerName && (
              <p className="mt-0.5 truncate text-xs text-gray-400">{hit.sellerName}</p>
            )}
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link
              href={`?${new URLSearchParams({ q, ...(category ? { category } : {}), ...(city ? { city } : {}), ...(priceMin != null ? { price_min: String(priceMin) } : {}), ...(priceMax != null ? { price_max: String(priceMax) } : {}), sort, page: String(page - 1) }).toString()}`}
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
              href={`?${new URLSearchParams({ q, ...(category ? { category } : {}), ...(city ? { city } : {}), ...(priceMin != null ? { price_min: String(priceMin) } : {}), ...(priceMax != null ? { price_max: String(priceMax) } : {}), sort, page: String(page + 1) }).toString()}`}
              className="text-blue-600 hover:underline"
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </>
  )
}

async function SellerResults({
  q,
  category,
  city,
}: {
  q: string
  category?: string
  city?: string
}) {
  if (!meiliSearch || !q) return null

  const filters: string[] = ['isActive = true']
  if (category) filters.push(`categoryId = "${category}"`)
  if (city) filters.push(`serviceCities = "${city}"`)

  const results = await meiliSearch.index(SELLERS_INDEX).search<SellerDocument>(q, {
    filter: filters.join(' AND '),
    limit: 4,
  })

  if (results.hits.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Vendeurs correspondants</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {results.hits.map((seller) => (
          <Link
            key={seller.id}
            href={`/sellers/${seller.slug ?? seller.id}`}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:shadow-md"
          >
            {seller.logoUrl ? (
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                <Image
                  src={seller.logoUrl}
                  alt={seller.businessName}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                {seller.businessName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{seller.businessName}</p>
              {seller.avgRating != null && (
                <p className="text-xs text-amber-500">
                  {'★'.repeat(Math.round(seller.avgRating))}
                  {'☆'.repeat(5 - Math.round(seller.avgRating))}
                  <span className="ml-1 text-gray-400">({seller.reviewCount})</span>
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const category = sp.category
  const city = sp.city?.trim()
  const priceMin = sp.price_min ? parseInt(sp.price_min, 10) : undefined
  const priceMax = sp.price_max ? parseInt(sp.price_max, 10) : undefined
  const sort = ['relevance', 'price_asc', 'price_desc', 'newest'].includes(sp.sort ?? '')
    ? (sp.sort ?? 'relevance')
    : 'relevance'
  const page = Math.max(1, Math.min(50, parseInt(sp.page ?? '1', 10) || 1))

  const allCategories = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-4 text-xl font-bold text-gray-900">Recherche</h1>
          <SearchBar defaultValue={q} placeholder="Produit, service, vendeur…" />
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters */}
          <div className="hidden w-56 flex-shrink-0 lg:block">
            <Suspense>
              <SearchFilters categories={allCategories} />
            </Suspense>
          </div>

          {/* Results */}
          <div className="min-w-0 flex-1">
            <Suspense>
              <SellerResults
                q={q}
                {...(category ? { category } : {})}
                {...(city ? { city } : {})}
              />
            </Suspense>
            <Suspense fallback={<ResultSkeleton />}>
              <SearchResults
                q={q}
                {...(category ? { category } : {})}
                {...(city ? { city } : {})}
                {...(priceMin !== undefined ? { priceMin } : {})}
                {...(priceMax !== undefined ? { priceMax } : {})}
                sort={sort}
                page={page}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
