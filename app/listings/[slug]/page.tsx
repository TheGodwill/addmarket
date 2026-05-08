import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { eq, and, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import { listings, listingImages, sellerProfiles, sellerReviews } from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { recordListingView, getListingViewCount } from '@/lib/views'
import { headers } from 'next/headers'
import { clientEnv } from '@/lib/env'
import { safeJsonLd } from '@/lib/safe-json-ld'
import { ImageGallery } from './image-gallery'

export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
}

async function getListing(id: string) {
  const rows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.status, 'active')))
    .limit(1)
  return rows.at(0) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListing(slug)
  if (!listing) return { title: 'Listing introuvable — ADDMarket' }

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'
  const price = listing.isQuoteOnly
    ? 'Sur devis'
    : listing.priceCents != null
      ? `${(listing.priceCents / 100).toFixed(2)} €`
      : undefined

  return {
    title: `${listing.title} — ADDMarket`,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      ...(listing.images[0] ? { images: [{ url: listing.images[0] }] } : {}),
      url: `${baseUrl}/listings/${slug}`,
      type: 'website',
    },
    other: price ? { 'product:price:amount': price, 'product:price:currency': 'EUR' } : {},
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params
  const listing = await getListing(slug)
  if (!listing) notFound()

  const [supabase, hdrs] = await Promise.all([createClient(), headers()])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown'
  void recordListingView(listing.id, ip)

  const [images, sellerRows, similarRows, viewCount, reviewStats] = await Promise.all([
    db
      .select()
      .from(listingImages)
      .where(eq(listingImages.listingId, listing.id))
      .orderBy(listingImages.sortOrder),
    db
      .select({
        id: sellerProfiles.id,
        slug: sellerProfiles.slug,
        businessName: sellerProfiles.businessName,
        logoUrl: sellerProfiles.logoUrl,
        description: sellerProfiles.description,
      })
      .from(sellerProfiles)
      .where(eq(sellerProfiles.id, listing.sellerId))
      .limit(1),
    db
      .select({
        id: listings.id,
        title: listings.title,
        priceCents: listings.priceCents,
        isQuoteOnly: listings.isQuoteOnly,
        images: listings.images,
      })
      .from(listings)
      .where(
        and(
          eq(listings.sellerId, listing.sellerId),
          eq(listings.status, 'active'),
          ne(listings.id, listing.id),
        ),
      )
      .limit(4),
    getListingViewCount(listing.id),
    db
      .select({ rating: sellerReviews.rating })
      .from(sellerReviews)
      .where(
        and(eq(sellerReviews.sellerId, listing.sellerId), eq(sellerReviews.status, 'published')),
      ),
  ])

  const seller = sellerRows.at(0)
  const avgRating =
    reviewStats.length > 0
      ? reviewStats.reduce((s, r) => s + r.rating, 0) / reviewStats.length
      : null

  const galleryImages = images.map((img) => ({ url: img.url, altText: img.altText ?? '' }))
  const price = listing.isQuoteOnly
    ? 'Sur devis'
    : listing.priceCents != null
      ? `${(listing.priceCents / 100).toFixed(2)} €`
      : null

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    image: listing.images,
    url: `${baseUrl}/listings/${slug}`,
    ...(listing.priceCents != null && !listing.isQuoteOnly
      ? {
          offers: {
            '@type': 'Offer',
            price: (listing.priceCents / 100).toFixed(2),
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
    ...(seller ? { brand: { '@type': 'Brand', name: seller.businessName } } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        {/* Image gallery */}
        <ImageGallery images={galleryImages} title={listing.title} />

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {price && <span className="text-2xl font-semibold text-blue-700">{price}</span>}
                <span className="text-xs text-gray-400">{viewCount} vue(s)</span>
              </div>
              {listing.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {listing.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <section aria-label="Description">
              <h2 className="mb-2 text-base font-semibold text-gray-900">Description</h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                {listing.description.split('\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* CTA */}
            {user ? (
              seller?.slug && (
                <Link
                  href={`/sellers/${seller.slug}`}
                  className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Contacter le vendeur
                </Link>
              )
            ) : (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                <p className="text-sm text-gray-700">Connectez-vous pour contacter le vendeur.</p>
                <Link
                  href="/auth/login"
                  className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline"
                >
                  Se connecter →
                </Link>
              </div>
            )}

            {/* Seller card */}
            {seller && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3">
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
                  <div>
                    <p className="font-semibold text-gray-900">{seller.businessName}</p>
                    {avgRating !== null && (
                      <p className="text-xs text-amber-500">
                        {'★'.repeat(Math.round(avgRating))}
                        {'☆'.repeat(5 - Math.round(avgRating))} ({reviewStats.length})
                      </p>
                    )}
                  </div>
                </div>
                {seller.slug && (
                  <Link
                    href={`/sellers/${seller.slug}`}
                    className="mt-3 block text-center text-xs text-blue-600 hover:underline"
                  >
                    Voir le profil complet →
                  </Link>
                )}
              </div>
            )}

            {/* Share */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-medium text-gray-500">Partager</p>
              <button
                onClick={undefined}
                className="w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
                aria-label="Copier le lien"
              >
                Copier le lien
              </button>
            </div>
          </aside>
        </div>

        {/* Similar listings */}
        {similarRows.length > 0 && (
          <section aria-label="Autres offres du vendeur">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Autres offres de ce vendeur
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {similarRows.map((item) => (
                <Link
                  key={item.id}
                  href={`/listings/${item.id}`}
                  className="group rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
                >
                  {item.images[0] && (
                    <div className="relative mb-2 h-28 overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={item.images[0]}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    </div>
                  )}
                  <p className="line-clamp-2 text-xs font-medium text-gray-900">{item.title}</p>
                  <p className="mt-1 text-xs text-blue-700">
                    {item.isQuoteOnly
                      ? 'Sur devis'
                      : item.priceCents != null
                        ? `${(item.priceCents / 100).toFixed(2)} €`
                        : ''}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
