import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { and, eq, sql } from 'drizzle-orm'
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
import { ProfilePhotoButton } from './profile-photo-buttons'
import { MapPin, Phone, Globe, Star, Edit2, Clock } from 'lucide-react'

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
  return cur >= (oh ?? 0) * 60 + (om ?? 0) && cur < (ch ?? 0) * 60 + (cm ?? 0)
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
  if (!seller) return { title: 'Boutique introuvable — ADDMarket' }

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.ci'
  return {
    title: `${seller.businessName} — ADDMarket`,
    description:
      seller.description?.slice(0, 160) ?? `Découvrez ${seller.businessName} sur ADDMarket.`,
    openGraph: {
      title: seller.businessName,
      description: seller.description?.slice(0, 160) ?? '',
      ...(seller.coverUrl
        ? { images: [{ url: seller.coverUrl }] }
        : seller.logoUrl
          ? { images: [{ url: seller.logoUrl }] }
          : {}),
      url: `${baseUrl}/sellers/${slug}`,
      type: 'website',
    },
  }
}

export default async function SellerProfilePage({ params }: Props) {
  const { slug } = await params
  const seller = await getSeller(slug)
  if (!seller) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwner = user?.id === seller.userId

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
      .orderBy(listings.publishedAt)
      .limit(24),

    db
      .select({
        id: sellerReviews.id,
        rating: sellerReviews.rating,
        comment: sellerReviews.comment,
        createdAt: sellerReviews.createdAt,
        reviewerName: sql<string | null>`(
          SELECT display_name FROM profiles WHERE id = ${sellerReviews.reviewerId}
        )`,
      })
      .from(sellerReviews)
      .where(and(eq(sellerReviews.sellerId, seller.id), eq(sellerReviews.status, 'published')))
      .orderBy(sellerReviews.createdAt)
      .limit(10),

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

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.ci'
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

      <div className="min-h-screen bg-gray-100">
        {/* ── Cover photo ─────────────────────────────────────── */}
        <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 sm:h-72">
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
          {/* Owner: edit cover */}
          {isOwner && (
            <div className="absolute bottom-3 right-3">
              <ProfilePhotoButton
                sellerSlug={slug}
                field="coverUrl"
                label="Modifier la couverture"
              />
            </div>
          )}
        </div>

        {/* ── Profile card ────────────────────────────────────── */}
        <div className="mx-auto max-w-4xl px-4">
          <div className="relative -mt-16 rounded-2xl border border-gray-200 bg-white pb-5 shadow-sm sm:-mt-20">
            {/* Logo + name row */}
            <div className="flex flex-wrap items-end gap-4 px-5 pt-3">
              {/* Logo */}
              <div className="relative -mt-10 h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:-mt-14 sm:h-32 sm:w-32">
                {seller.logoUrl ? (
                  <Image
                    src={seller.logoUrl}
                    alt={seller.businessName}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-blue-100 text-4xl font-bold text-blue-600">
                    {seller.businessName.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Owner: edit logo */}
                {isOwner && (
                  <div className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 transition-opacity hover:opacity-100">
                    <ProfilePhotoButton
                      sellerSlug={slug}
                      field="logoUrl"
                      label="Photo"
                      className="scale-90"
                    />
                  </div>
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {seller.businessName}
                  </h1>
                  {isOpen && (
                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Ouvert
                    </span>
                  )}
                  {profile?.membershipStatus === 'verified' && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      ✓ Membre vérifié
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                  {categoryName && <span>{categoryName}</span>}
                  {avgRating !== null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                      <span className="font-semibold text-amber-600">{avgRating.toFixed(1)}</span>
                      <span className="text-gray-400">({reviewRows.length} avis)</span>
                    </span>
                  )}
                  {profile?.churchName && (
                    <span className="text-xs text-blue-600">{profile.churchName}</span>
                  )}
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-2 pb-1">
                {isOwner ? (
                  <Link
                    href="/sell/profile/edit"
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Edit2 className="h-4 w-4" aria-hidden />
                    Modifier le profil
                  </Link>
                ) : user ? (
                  <>
                    {seller.contactPhone && (
                      <a
                        href={`tel:${seller.contactPhone}`}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Phone className="h-4 w-4" aria-hidden />
                        Appeler
                      </a>
                    )}
                    {seller.contactWhatsapp && (
                      <a
                        href={`https://wa.me/${seller.contactWhatsapp.replace(/\D/g, '')}`}
                        className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WhatsApp
                      </a>
                    )}
                    <ContactSellerButton
                      sellerProfileId={seller.id}
                      sellerName={seller.businessName}
                    />
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Connectez-vous pour contacter →
                  </Link>
                )}
              </div>
            </div>

            {/* Description */}
            {seller.description && (
              <div className="mt-4 border-t border-gray-100 px-5 pt-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                  {seller.description}
                </p>
              </div>
            )}

            {/* Meta info row */}
            <div className="mt-3 flex flex-wrap gap-4 px-5 text-xs text-gray-400">
              {seller.serviceCities.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {seller.serviceCities.slice(0, 3).join(', ')}
                  {seller.serviceCities.length > 3 && ` +${seller.serviceCities.length - 3}`}
                </span>
              )}
              {seller.openingHours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {isOpen ? 'Ouvert maintenant' : 'Fermé'}
                </span>
              )}
              {socialLinks.website && (
                <a
                  href={socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  Site web
                </a>
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
            </div>
          </div>

          {/* ── Catalogue ────────────────────────────────────── */}
          <section className="mt-6" aria-label="Catalogue">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Catalogue
                {activeListings.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({activeListings.length} offre{activeListings.length > 1 ? 's' : ''})
                  </span>
                )}
              </h2>
              {isOwner && (
                <Link
                  href="/sell/listings/new"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  + Ajouter une offre
                </Link>
              )}
            </div>

            {activeListings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <p className="text-sm text-gray-400">Aucune offre disponible pour le moment.</p>
                {isOwner && (
                  <Link
                    href="/sell/listings/new"
                    className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Créer ma première offre →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {activeListings.map((item) => (
                  <Link
                    key={item.id}
                    href={`/listings/${item.slug ?? item.id}`}
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative h-44 overflow-hidden bg-gray-100">
                      {item.images[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 33vw"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl text-gray-200">
                          🛍️
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="mt-1 font-semibold text-blue-700">
                        {item.isQuoteOnly
                          ? 'Sur devis'
                          : item.priceCents != null
                            ? `${(item.priceCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`
                            : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Avis ─────────────────────────────────────────── */}
          {reviewRows.length > 0 && (
            <section className="mb-8 mt-6" aria-label="Avis clients">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  Avis clients
                  {avgRating !== null && (
                    <span className="ml-2 text-sm font-normal text-amber-500">
                      ★ {avgRating.toFixed(1)} ({reviewRows.length})
                    </span>
                  )}
                </h2>
                {user && user.id !== seller.userId && (
                  <Link
                    href={`/sellers/${slug}/review`}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Laisser un avis →
                  </Link>
                )}
              </div>

              <div className="space-y-3">
                {reviewRows.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                          {(review.reviewerName ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {review.reviewerName ?? 'Membre'}
                          </p>
                          <span className="text-xs text-amber-400">
                            {'★'.repeat(review.rating)}
                            {'☆'.repeat(5 - review.rating)}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {review.createdAt.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty reviews + CTA */}
          {reviewRows.length === 0 && user && user.id !== seller.userId && (
            <div className="mb-8 mt-6 rounded-2xl border border-dashed border-gray-300 bg-white py-8 text-center">
              <p className="text-sm text-gray-400">Soyez le premier à laisser un avis.</p>
              <Link
                href={`/sellers/${slug}/review`}
                className="mt-3 inline-block rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Laisser un avis →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
