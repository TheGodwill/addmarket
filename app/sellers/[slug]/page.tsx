import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  sellerProfiles,
  listings,
  sellerReviews,
  categories,
  profiles,
  churches,
} from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { clientEnv } from '@/lib/env'
import { safeJsonLd } from '@/lib/safe-json-ld'
import type { OpeningHours } from '@/db/schema'
import { ContactSellerButton } from '@/app/messages/contact-seller-button'

export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
}

function isCurrentlyOpen(hours: OpeningHours | null | undefined): boolean {
  if (!hours) return false
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const now = new Date()
  const day = days[now.getDay()] as keyof OpeningHours
  const slot = hours[day]
  if (!slot) return false
  const [oh, om] = slot.open.split(':').map(Number)
  const [ch, cm] = slot.close.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  const open = (oh ?? 0) * 60 + (om ?? 0)
  const close = (ch ?? 0) * 60 + (cm ?? 0)
  return cur >= open && cur < close
}

async function getSeller(slug: string) {
  const rows = await db
    .select()
    .from(sellerProfiles)
    .where(and(eq(sellerProfiles.slug, slug), eq(sellerProfiles.isActive, true)))
    .limit(1)
  return rows.at(0) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const seller = await getSeller(slug)
  if (!seller) return { title: 'Vendeur introuvable — ADDMarket' }

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'

  return {
    title: `${seller.businessName} — ADDMarket`,
    description:
      seller.description?.slice(0, 160) ?? `Découvrez ${seller.businessName} sur ADDMarket.`,
    openGraph: {
      title: seller.businessName,
      description: seller.description?.slice(0, 160) ?? '',
      ...(seller.logoUrl ? { images: [{ url: seller.logoUrl }] } : {}),
      url: `${baseUrl}/sellers/${slug}`,
      type: 'website',
    },
  }
}

export default async function SellerProfilePage({ params }: Props) {
  const { slug } = await params
  const seller = await getSeller(slug)
  if (!seller) notFound()

  const [supabase] = await Promise.all([createClient()])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [categoryRow, activeListings, reviewRows, profileRow] = await Promise.all([
    seller.categoryId
      ? db
          .select({ name: categories.name })
          .from(categories)
          .where(eq(categories.id, seller.categoryId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        id: listings.id,
        title: listings.title,
        priceCents: listings.priceCents,
        isQuoteOnly: listings.isQuoteOnly,
        images: listings.images,
        slug: listings.slug,
      })
      .from(listings)
      .where(and(eq(listings.sellerId, seller.id), eq(listings.status, 'active')))
      .limit(24),
    db
      .select({
        rating: sellerReviews.rating,
        comment: sellerReviews.comment,
        createdAt: sellerReviews.createdAt,
      })
      .from(sellerReviews)
      .where(and(eq(sellerReviews.sellerId, seller.id), eq(sellerReviews.status, 'published')))
      .limit(5),
    db
      .select({ churchName: churches.name, membershipStatus: profiles.membershipStatus })
      .from(profiles)
      .leftJoin(churches, eq(profiles.churchId, churches.id))
      .where(eq(profiles.id, seller.userId))
      .limit(1),
  ])

  const categoryName = categoryRow.at(0)?.name
  const profile = profileRow.at(0)
  const isOpen = isCurrentlyOpen(seller.openingHours)
  const avgRating =
    reviewRows.length > 0 ? reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length : null
  const socialLinks = (seller.socialLinks ?? {}) as Record<string, string>

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: seller.businessName,
    description: seller.description ?? '',
    url: `${baseUrl}/sellers/${slug}`,
    ...(seller.logoUrl ? { image: seller.logoUrl } : {}),
    ...(avgRating !== null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avgRating.toFixed(1),
            reviewCount: reviewRows.length,
          },
        }
      : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="mx-auto max-w-4xl">
        {/* Cover */}
        <div className="relative h-48 overflow-hidden rounded-b-2xl bg-gradient-to-r from-blue-100 to-blue-200 sm:h-64">
          {seller.coverUrl && (
            <Image
              src={seller.coverUrl}
              alt={`Couverture de ${seller.businessName}`}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          )}
        </div>

        {/* Header */}
        <div className="-mt-10 px-4 pb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
              {seller.logoUrl ? (
                <Image
                  src={seller.logoUrl}
                  alt={seller.businessName}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-blue-600">
                  {seller.businessName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{seller.businessName}</h1>
                {isOpen && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Ouvert maintenant
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {categoryName && <span>{categoryName}</span>}
                {avgRating !== null && (
                  <span className="text-amber-500">
                    {'★'.repeat(Math.round(avgRating))}
                    {'☆'.repeat(5 - Math.round(avgRating))}
                    <span className="ml-1 text-gray-500">({reviewRows.length} avis)</span>
                  </span>
                )}
                {profile?.churchName && (
                  <span className="flex items-center gap-1 text-xs text-blue-600">
                    ✓ Membre — {profile.churchName}
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            {user && user.id !== seller.userId ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                {seller.contactPhone && (
                  <a
                    href={`tel:${seller.contactPhone}`}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Appeler
                  </a>
                )}
                {seller.contactWhatsapp && (
                  <a
                    href={`https://wa.me/${seller.contactWhatsapp.replace(/\D/g, '')}`}
                    className="rounded-xl border border-green-200 bg-white px-4 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-50"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
                <ContactSellerButton sellerProfileId={seller.id} sellerName={seller.businessName} />
              </div>
            ) : !user ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-center text-sm">
                <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">
                  Connectez-vous pour contacter →
                </Link>
              </div>
            ) : null}
          </div>

          {/* Description */}
          {seller.description && (
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{seller.description}</p>
          )}

          {/* Zone + social */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            {seller.serviceCities.length > 0 && (
              <span>
                📍 {seller.serviceCities.slice(0, 3).join(', ')}
                {seller.serviceCities.length > 3 ? ` +${seller.serviceCities.length - 3}` : ''}
              </span>
            )}
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600"
              >
                Instagram
              </a>
            )}
            {socialLinks.facebook && (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600"
              >
                Facebook
              </a>
            )}
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600"
              >
                Site web
              </a>
            )}
          </div>
        </div>

        {/* Listings grid */}
        {activeListings.length > 0 ? (
          <section className="px-4 py-4" aria-label="Catalogue">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Catalogue ({activeListings.length} offre{activeListings.length > 1 ? 's' : ''})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {activeListings.map((item) => (
                <Link
                  key={item.id}
                  href={`/listings/${item.id}`}
                  className="group rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
                >
                  <div className="relative mb-2 h-36 overflow-hidden rounded-lg bg-gray-100">
                    {item.images[0] ? (
                      <Image
                        src={item.images[0]}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 33vw"
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
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Aucune offre disponible pour le moment.
          </div>
        )}

        {/* Reviews */}
        {reviewRows.length > 0 && (
          <section className="px-4 py-6" aria-label="Avis clients">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Avis ({reviewRows.length})
            </h2>
            <div className="space-y-3">
              {reviewRows.map((review, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-500">
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {review.createdAt.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
