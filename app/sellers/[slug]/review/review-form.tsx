'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitReview } from './actions'

interface Props {
  sellerId: string
  sellerSlug: string
  existing: { rating: number; comment: string } | null
}

export function ReviewForm({ sellerId, sellerSlug, existing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Choisissez une note entre 1 et 5 étoiles')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitReview({
        sellerId,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      })
      if (result.success) {
        setSubmitted(true)
        setTimeout(() => router.push(`/sellers/${sellerSlug}`), 1500)
      } else {
        setError(result.error ?? 'Une erreur est survenue')
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="font-semibold text-green-700">Avis envoyé — merci !</p>
        <p className="mt-1 text-sm text-gray-500">Redirection en cours…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Star rating */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Note *</label>
        <div className="flex gap-1" role="group" aria-label="Note sur 5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
              className="text-3xl leading-none transition-transform hover:scale-110"
            >
              {star <= (hovered || rating) ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="comment" className="mb-1 block text-sm font-medium text-gray-700">
          Commentaire (optionnel)
        </label>
        <textarea
          id="comment"
          rows={5}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Décrivez votre expérience avec ce vendeur…"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-right text-xs text-gray-400">{comment.length}/1000</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Envoi…' : existing ? 'Modifier mon avis' : 'Publier mon avis'}
      </button>
    </form>
  )
}
