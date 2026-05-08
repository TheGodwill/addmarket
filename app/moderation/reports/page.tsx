import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import { getModerationReports, getModerationStats } from './actions'
import { ReportRow } from './report-row'

export const metadata: Metadata = { title: 'Modération — Signalements' }

type Filter = 'all' | 'new' | 'in_review' | 'high'

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Tous',
  new: 'Nouveaux',
  in_review: 'En cours',
  high: 'Priorité haute',
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  fake: 'Faux',
  inappropriate: 'Inapproprié',
  illegal: 'Illégal',
  scam: 'Arnaque',
  other: 'Autre',
}

export { REASON_LABELS }

export default async function ModerationReportsPage({
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
  if (!can(role, 'moderation.read')) redirect('/')

  const sp = await searchParams
  const filter = (
    ['all', 'new', 'in_review', 'high'].includes(sp.filter ?? '') ? sp.filter : 'all'
  ) as Filter
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const [data, stats] = await Promise.all([
    getModerationReports(filter, page),
    getModerationStats(),
  ])

  if (!data) redirect('/')
  const { reports, total, totalPages } = data

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Signalements</h1>
          <div className="flex gap-3">
            <Link href="/moderation/queue" className="text-sm text-blue-600 hover:underline">
              File de modération →
            </Link>
            <Link href="/admin/reviews" className="text-sm text-blue-600 hover:underline">
              Avis →
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: stats.total },
              { label: 'En attente', value: stats.pending },
              { label: 'Résolus', value: stats.resolved },
              { label: 'Délai moy. (h)', value: stats.avgResolutionHours },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 bg-white p-4 text-center"
              >
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {(['all', 'new', 'in_review', 'high'] as Filter[]).map((f) => (
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
          <span className="ml-auto self-center text-sm text-gray-500">{total} signalement(s)</span>
        </div>

        {reports.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            Aucun signalement dans cette catégorie.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportRow key={report.id} report={report} />
            ))}
          </div>
        )}

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
    </main>
  )
}
