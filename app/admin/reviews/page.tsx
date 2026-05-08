import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import { getAdminReviews } from './actions'
import { ReviewModerationRow } from './review-moderation-row'

export const metadata: Metadata = { title: 'Admin — Avis' }

type Filter = 'all' | 'pending' | 'reported'

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Tous',
  pending: 'En attente',
  reported: 'Signalés',
}

export default async function AdminReviewsPage({
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
  if (!can(role, 'review.moderate')) redirect('/')

  const sp = await searchParams
  const filter = (
    ['all', 'pending', 'reported'].includes(sp.filter ?? '') ? sp.filter : 'all'
  ) as Filter
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const { reviews, total, totalPages } = await getAdminReviews(filter, page)

  return (
    <div>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Modération des avis ({total})</h1>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2">
          {(['all', 'pending', 'reported'] as Filter[]).map((f) => (
            <Link
              key={f}
              href={`?filter=${f}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {FILTER_LABELS[f]}
            </Link>
          ))}
        </div>

        {reviews.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            Aucun avis dans cette catégorie.
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewModerationRow key={review.id} review={review} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            {page > 1 && (
              <Link
                href={`?filter=${filter}&page=${page - 1}`}
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
                href={`?filter=${filter}&page=${page + 1}`}
                className="text-blue-600 hover:underline"
              >
                Suivant →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
