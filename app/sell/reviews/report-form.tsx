'use client'
import { useState, useTransition } from 'react'
import { reportReview } from './actions'

interface Props {
  reviewId: string
}

export function ReportForm({ reviewId }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await reportReview(reviewId, reason)
      if (result.success) {
        setDone(true)
        setOpen(false)
      } else {
        setError(result.error ?? 'Erreur')
      }
    })
  }

  if (done) {
    return (
      <p className="mt-1 text-xs text-amber-600">Signalement envoyé — en cours de traitement.</p>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-red-500 hover:underline"
      >
        Signaler cet avis
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1 space-y-2">
      <textarea
        rows={2}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif du signalement…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {isPending ? '…' : 'Signaler'}
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
