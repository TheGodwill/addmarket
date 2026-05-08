import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import { getSellerReviews } from './actions'
import { ReplyForm } from './reply-form'
import { ReportForm } from './report-form'

export const metadata: Metadata = { title: 'Mes avis — ADDMarket' }

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  published: 'Publié',
  hidden: 'Masqué',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  hidden: 'bg-gray-100 text-gray-500',
}

export default async function SellerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'review.respond.own_seller')) redirect('/sell/dashboard')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const data = await getSellerReviews(page)
  if (!data) redirect('/sell/dashboard')

  const { reviews, total, totalPages } = data

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mes avis ({total})</h1>
          <Link href="/sell/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Tableau de bord
          </Link>
        </div>

        {reviews.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">Aucun avis pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{review.reviewerName}</span>
                    {review.isVerified && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                        Vérifié
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[review.status] ?? ''}`}
                    >
                      {STATUS_LABELS[review.status] ?? review.status}
                    </span>
                  </div>
                  <time className="text-xs text-gray-400">
                    {review.createdAt.toLocaleDateString('fr-FR')}
                  </time>
                </div>

                {review.comment && (
                  <p className="mt-3 text-sm leading-relaxed text-gray-700">{review.comment}</p>
                )}

                {review.reportReason && (
                  <p className="mt-2 text-xs text-amber-600">
                    Signalement en attente : {review.reportReason}
                  </p>
                )}

                {/* Seller response */}
                {review.response ? (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3">
                    <p className="mb-1 text-xs font-semibold text-gray-500">Votre réponse</p>
                    <p className="text-sm text-gray-700">{review.response}</p>
                    <ReplyForm reviewId={review.id} existing={review.response} />
                  </div>
                ) : (
                  review.status === 'published' && (
                    <div className="mt-3">
                      <ReplyForm reviewId={review.id} existing={null} />
                    </div>
                  )
                )}

                {/* Report */}
                {review.status === 'published' && !review.reportReason && (
                  <div className="mt-2">
                    <ReportForm reviewId={review.id} />
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
      </div>
    </main>
  )
}
