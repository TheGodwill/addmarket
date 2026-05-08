import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db/client'
import { sellerProfiles } from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { getPaginatedReviews, getReviewStats } from '../review/actions'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const rows = await db
    .select({ businessName: sellerProfiles.businessName })
    .from(sellerProfiles)
    .where(and(eq(sellerProfiles.slug, slug), eq(sellerProfiles.isActive, true)))
    .limit(1)
  const name = rows.at(0)?.businessName ?? 'Vendeur'
  return { title: `Avis — ${name} · ADDMarket` }
}

export default async function SellerReviewsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const sellerRows = await db
    .select({ id: sellerProfiles.id, businessName: sellerProfiles.businessName })
    .from(sellerProfiles)
    .where(and(eq(sellerProfiles.slug, slug), eq(sellerProfiles.isActive, true)))
    .limit(1)
  const seller = sellerRows.at(0)
  if (!seller) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [stats, { reviews, totalPages }] = await Promise.all([
    getReviewStats(seller.id),
    getPaginatedReviews(seller.id, page),
  ])

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/sellers/${slug}`} className="text-sm text-blue-600 hover:underline">
          ← {seller.businessName}
        </Link>
      </div>

      <h1 className="mb-2 text-xl font-bold text-gray-900">Avis ({stats.total})</h1>

      {/* Rating distribution */}
      {stats.total > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">{stats.avg.toFixed(1)}</p>
              <p className="text-sm text-amber-500">
                {'★'.repeat(Math.round(stats.avg))}
                {'☆'.repeat(5 - Math.round(stats.avg))}
              </p>
              <p className="text-xs text-gray-500">{stats.total} avis</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star - 1] ?? 0
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-right text-gray-500">{star}</span>
                    <span className="text-amber-400">★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-gray-400">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* CTA to leave review */}
      {user && (
        <div className="mb-6">
          <Link
            href={`/sellers/${slug}/review`}
            className="inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Laisser un avis
          </Link>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          Aucun avis publié pour ce vendeur.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm text-amber-500">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {review.reviewerName}
                  </span>
                  {review.isVerified && (
                    <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                      Membre vérifié
                    </span>
                  )}
                </div>
                <time className="flex-shrink-0 text-xs text-gray-400">
                  {review.createdAt.toLocaleDateString('fr-FR')}
                </time>
              </div>
              {review.comment && (
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{review.comment}</p>
              )}
              {review.response && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 text-xs font-semibold text-gray-500">Réponse du vendeur</p>
                  <p className="text-sm leading-relaxed text-gray-700">{review.response}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link href={`?page=${page - 1}`} className="text-blue-600 hover:underline">
              ← Précédent
            </Link>
          )}
          <span className="text-gray-500">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`?page=${page + 1}`} className="text-blue-600 hover:underline">
              Suivant →
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
