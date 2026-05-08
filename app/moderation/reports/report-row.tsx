'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  resolveReport,
  startReview,
  markReportAbusive,
  warnUser,
  suspendUser,
  banUser,
} from './actions'

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  fake: 'Faux',
  inappropriate: 'Inapproprié',
  illegal: 'Illégal',
  scam: 'Arnaque',
  other: 'Autre',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-100 text-red-700',
  in_review: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-100 text-gray-500',
}

interface Report {
  id: string
  targetType: string
  targetId: string
  reason: string
  details: string | null
  status: string
  priority: string
  createdAt: Date
  reporterName: string
}

type ActionPanel = 'resolve' | 'reject' | 'warn' | 'suspend' | 'ban' | null

export function ReportRow({ report }: { report: Report }) {
  const [isPending, startTransition] = useTransition()
  const [panel, setPanel] = useState<ActionPanel>(null)
  const [note, setNote] = useState('')
  const [suspendDays, setSuspendDays] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (done) return null

  function act(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (result.success) {
        setDone(true)
        setPanel(null)
      } else setError(result.error ?? 'Erreur')
    })
  }

  const targetLink =
    report.targetType === 'listing'
      ? `/listings/${report.targetId}`
      : report.targetType === 'seller'
        ? `/sellers/${report.targetId}`
        : null

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {report.priority === 'high' && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              PRIORITÉ HAUTE
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[report.status] ?? ''}`}
          >
            {report.status}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {report.targetType}
          </span>
          <span className="text-xs text-gray-600">
            {REASON_LABELS[report.reason] ?? report.reason}
          </span>
        </div>
        <time className="text-xs text-gray-400">
          {report.createdAt.toLocaleDateString('fr-FR')}
        </time>
      </div>

      <p className="mt-1 text-xs text-gray-500">Signalé par : {report.reporterName}</p>
      {report.details && <p className="mt-2 text-sm text-gray-700">{report.details}</p>}

      {targetLink && (
        <Link
          href={targetLink}
          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
          target="_blank"
        >
          Voir le contenu →
        </Link>
      )}

      {/* Actions (only if not resolved/rejected) */}
      {!['resolved', 'rejected'].includes(report.status) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.status === 'new' && (
            <button
              onClick={() => act(() => startReview(report.id))}
              disabled={isPending}
              className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Prendre en charge
            </button>
          )}
          <button
            onClick={() => setPanel('resolve')}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
          >
            Résoudre
          </button>
          <button
            onClick={() => setPanel('reject')}
            disabled={isPending}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Rejeter
          </button>
          <button
            onClick={() => act(() => markReportAbusive(report.id))}
            disabled={isPending}
            className="rounded-lg border border-orange-200 px-3 py-1 text-xs text-orange-600 hover:bg-orange-50 disabled:opacity-50"
          >
            Signalement abusif
          </button>
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setPanel('warn')}
              disabled={isPending}
              className="rounded-lg border border-yellow-200 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-50"
            >
              Avertir
            </button>
            <button
              onClick={() => setPanel('suspend')}
              disabled={isPending}
              className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Suspendre
            </button>
            <button
              onClick={() => setPanel('ban')}
              disabled={isPending}
              className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
            >
              Bannir
            </button>
          </div>
        </div>
      )}

      {/* Action panels */}
      {panel && (
        <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
          {panel === 'suspend' && (
            <div className="flex items-center gap-2 text-xs">
              <label>Durée (jours) :</label>
              <input
                type="number"
                min={1}
                max={365}
                value={suspendDays}
                onChange={(e) => setSuspendDays(parseInt(e.target.value, 10) || 1)}
                className="w-20 rounded border border-gray-200 px-2 py-1"
              />
            </div>
          )}
          <textarea
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motif obligatoire…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={isPending || !note.trim()}
              onClick={() => {
                if (panel === 'resolve') act(() => resolveReport(report.id, 'resolve', note))
                else if (panel === 'reject') act(() => resolveReport(report.id, 'reject', note))
                else if (panel === 'warn') act(() => warnUser(report.targetId, note))
                else if (panel === 'suspend')
                  act(() => suspendUser(report.targetId, note, suspendDays))
                else if (panel === 'ban') act(() => banUser(report.targetId, note))
              }}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '…' : 'Confirmer'}
            </button>
            <button
              onClick={() => {
                setPanel(null)
                setNote('')
              }}
              className="text-xs text-gray-400 hover:underline"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
