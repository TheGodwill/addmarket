'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  waiting: 'En attente info',
  cancelled: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  waiting: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

interface RequestRow {
  id: string
  status: string
  submittedAt: string
  submissionDisplayName: string | null
  submissionCity: string | null
  cardNumberLast4: string | null
  processedAt: string | null
  isAlert: boolean
}

interface VerificationListProps {
  requests: RequestRow[]
  nextCursor: string | undefined
  currentStatus: string | undefined
}

export function VerificationList({ requests, nextCursor, currentStatus }: VerificationListProps) {
  const router = useRouter()
  const STATUS_FILTERS = ['pending', 'waiting', 'approved', 'rejected']

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/referent/verifications')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${!currentStatus ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Toutes
        </button>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => router.push(`/referent/verifications?status=${s}`)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${currentStatus === s ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Aucune demande
          {currentStatus ? ` avec le statut « ${STATUS_LABELS[currentStatus]} »` : ''}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Membre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Soumis le
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Carte
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => {
                const isOld = r.isAlert
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${isOld ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {r.submissionDisplayName ?? '—'}
                        {isOld && <span className="ml-2 text-xs text-red-600">⚠ &gt;72h</span>}
                      </p>
                      <p className="text-xs text-gray-500">{r.submissionCity ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(r.submittedAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-500">
                      {r.cardNumberLast4 ? `****${r.cardNumberLast4}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/referent/verifications/${r.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && (
        <div className="text-center">
          <Link
            href={`/referent/verifications?${currentStatus ? `status=${currentStatus}&` : ''}cursor=${nextCursor}`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Charger plus
          </Link>
        </div>
      )}
    </div>
  )
}
