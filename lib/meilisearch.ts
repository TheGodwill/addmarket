import 'server-only'
import { MeiliSearch } from 'meilisearch'

function createClient(apiKey: string | undefined): MeiliSearch | null {
  const host = process.env.MEILISEARCH_HOST
  if (!host || !apiKey) {
    return null
  }
  return new MeiliSearch({ host, apiKey })
}

// Admin client — server-side only, never exposed to the browser
export const meiliAdmin = createClient(process.env.MEILISEARCH_ADMIN_KEY)

// Search client — uses the search-only key (read-only, lower privilege)
export const meiliSearch = createClient(
  process.env.MEILISEARCH_SEARCH_KEY ?? process.env.MEILISEARCH_ADMIN_KEY,
)

export const LISTINGS_INDEX = 'listings'
export const SELLERS_INDEX = 'sellers'

export interface ListingDocument {
  id: string
  title: string
  description: string
  slug: string
  sellerId: string
  sellerSlug: string | null
  sellerName: string
  categoryId: string | null
  categoryName: string | null
  categorySlug: string | null
  priceCents: number | null
  isQuoteOnly: boolean
  tags: string[]
  images: string[]
  stockStatus: string
  serviceCities: string[]
  status: string
  createdAt: number
  publishedAt: number | null
}

export interface SellerDocument {
  id: string
  slug: string | null
  businessName: string
  description: string | null
  categoryId: string | null
  categoryName: string | null
  categorySlug: string | null
  serviceCities: string[]
  serviceAreaKm: number | null
  logoUrl: string | null
  isActive: boolean
  avgRating: number | null
  reviewCount: number
  listingCount: number
  createdAt: number
}

export async function configureIndexes(): Promise<void> {
  if (!meiliAdmin) return

  await meiliAdmin.index(LISTINGS_INDEX).updateSettings({
    searchableAttributes: ['title', 'description', 'tags', 'sellerName', 'categoryName'],
    filterableAttributes: [
      'categoryId',
      'categorySlug',
      'sellerId',
      'status',
      'stockStatus',
      'isQuoteOnly',
      'priceCents',
      'serviceCities',
      'publishedAt',
    ],
    sortableAttributes: ['priceCents', 'createdAt', 'publishedAt'],
    synonyms: {
      chrétien: ['protestant', 'évangélique', 'église'],
      protestant: ['chrétien', 'évangélique'],
      évangélique: ['chrétien', 'protestant'],
      btp: ['bâtiment', 'construction', 'travaux'],
      bâtiment: ['btp', 'construction', 'travaux'],
    },
    pagination: { maxTotalHits: 1000 },
  })

  await meiliAdmin.index(SELLERS_INDEX).updateSettings({
    searchableAttributes: ['businessName', 'description', 'serviceCities', 'categoryName'],
    filterableAttributes: ['categoryId', 'categorySlug', 'isActive', 'serviceCities'],
    sortableAttributes: ['avgRating', 'reviewCount', 'createdAt'],
    pagination: { maxTotalHits: 500 },
  })
}
