import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { meiliSearch, LISTINGS_INDEX, SELLERS_INDEX } from '@/lib/meilisearch'
import { checkRateLimit } from '@/lib/rate-limit'

const SORT_OPTIONS = {
  relevance: undefined,
  price_asc: 'priceCents:asc',
  price_desc: 'priceCents:desc',
  newest: 'publishedAt:desc',
} as const

const searchSchema = z.object({
  q: z.string().max(200).default(''),
  type: z.enum(['listings', 'sellers', 'all']).default('listings'),
  category: z.string().uuid().optional(),
  city: z.string().max(100).optional(),
  price_min: z.coerce.number().int().nonnegative().optional(),
  price_max: z.coerce.number().int().nonnegative().optional(),
  quote_only: z.enum(['true', 'false']).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).default('relevance'),
  page: z.coerce.number().int().positive().max(50).default(1),
  per_page: z.coerce.number().int().positive().max(48).default(24),
})

export async function GET(req: NextRequest) {
  // Rate limit by IP — 60 req/min
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit('searchApi', ip)
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = searchSchema.safeParse(sp)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Paramètres invalides' },
      { status: 400 },
    )
  }

  const { q, type, category, city, price_min, price_max, quote_only, sort, page, per_page } =
    parsed.data

  // Meilisearch not configured (dev without credentials) → empty results
  if (!meiliSearch) {
    return NextResponse.json(
      { listings: [], sellers: [], total: 0, page, totalPages: 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    )
  }

  try {
    const offset = (page - 1) * per_page

    // Build listing filters (whitelist — injection-safe)
    const listingFilters: string[] = ['status = "active"']
    if (category) listingFilters.push(`categoryId = "${category}"`)
    if (city) listingFilters.push(`serviceCities = "${city}"`)
    if (price_min !== undefined) listingFilters.push(`priceCents >= ${price_min}`)
    if (price_max !== undefined) listingFilters.push(`priceCents <= ${price_max}`)
    if (quote_only === 'true') listingFilters.push('isQuoteOnly = true')

    const sellerFilters: string[] = ['isActive = true']
    if (category) sellerFilters.push(`categoryId = "${category}"`)
    if (city) sellerFilters.push(`serviceCities = "${city}"`)

    const sortValue =
      sort !== 'relevance' ? SORT_OPTIONS[sort as keyof typeof SORT_OPTIONS] : undefined
    const sortBy = sortValue ? [sortValue] : []

    const [listingResults, sellerResults] = await Promise.all([
      type !== 'sellers'
        ? meiliSearch.index(LISTINGS_INDEX).search(q, {
            filter: listingFilters.join(' AND '),
            sort: sortBy,
            offset,
            limit: per_page,
            attributesToHighlight: ['title', 'description'],
            highlightPreTag: '<mark>',
            highlightPostTag: '</mark>',
            attributesToCrop: ['description'],
            cropLength: 120,
          })
        : null,
      type !== 'listings'
        ? meiliSearch.index(SELLERS_INDEX).search(q, {
            filter: sellerFilters.join(' AND '),
            sort: ['reviewCount:desc'],
            offset,
            limit: per_page,
          })
        : null,
    ])

    return NextResponse.json(
      {
        listings: listingResults?.hits ?? [],
        sellers: sellerResults?.hits ?? [],
        listingsTotal: listingResults?.estimatedTotalHits ?? 0,
        sellersTotal: sellerResults?.estimatedTotalHits ?? 0,
        page,
        totalPages: Math.ceil((listingResults?.estimatedTotalHits ?? 0) / per_page),
        processingTimeMs:
          (listingResults?.processingTimeMs ?? 0) + (sellerResults?.processingTimeMs ?? 0),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    )
  } catch (err) {
    console.error('[search] Meilisearch error:', err)
    return NextResponse.json({ error: 'Erreur de recherche' }, { status: 503 })
  }
}
