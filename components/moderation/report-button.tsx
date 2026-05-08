'use client'
import { useState, useTransition } from 'react'
import { submitReport } from '@/app/moderation/reports/actions'

type TargetType = 'listing' | 'seller' | 'review'
type Reason = 'spam' | 'fake' | 'inappropriate' | 'illegal' | 'scam' | 'other'

const REASON_LABELS: Record<Reason, string> = {
  spam: 'Spam',
  fake: 'Faux / trompeur',
  inappropriate: 'Contenu inapproprié',
  illegal: 'Contenu illégal',
  scam: 'Arnaque',
  other: 'Autre',
}

interface Props {
  targetType: TargetType
  targetId: string
}

export function ReportButton({ targetType, targetId }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<Reason>('spam')
  const [details, setDetails] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitReport({
        targetType,
        targetId,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      })
      if (result.success) {
        setDone(true)
        setOpen(false)
      } else setError(result.error ?? 'Erreur')
    })
  }

  if (done) {
    return <span className="text-xs text-gray-400">Signalement envoyé</span>
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-red-500 hover:underline"
      >
        Signaler ce contenu
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 space-y-3 rounded-xl border border-red-100 bg-red-50 p-4"
    >
      <p className="text-sm font-medium text-gray-900">Signaler ce contenu</p>

      <div>
        <label className="mb-1 block text-xs text-gray-600">Motif</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as Reason)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          {(Object.entries(REASON_LABELS) as [Reason, string][]).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-gray-600">Détails (optionnel)</label>
        <textarea
          rows={3}
          maxLength={500}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Décrivez le problème…"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {isPending ? 'Envoi…' : 'Envoyer le signalement'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:underline"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
