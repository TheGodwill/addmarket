'use client'
import { useState, useTransition } from 'react'
import { respondToReview } from './actions'

interface Props {
  reviewId: string
  existing: string | null
}

export function ReplyForm({ reviewId, existing }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(existing ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await respondToReview(reviewId, text)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? 'Erreur')
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs text-blue-600 hover:underline">
        {existing ? 'Modifier la réponse' : 'Répondre à cet avis'}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <textarea
        rows={3}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Votre réponse…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Envoi…' : 'Publier'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
