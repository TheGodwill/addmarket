'use client'
import { useState, useTransition } from 'react'
import { hideReview, publishReview, deleteReview } from './actions'

interface Review {
  id: string
  rating: number
  comment: string | null
  status: string
  reportReason: string | null
  isVerified: boolean
  createdAt: Date
  reviewerName: string
  sellerName: string
  sellerSlug: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  hidden: 'bg-gray-100 text-gray-500',
}

export function ReviewModerationRow({ review }: { review: Review }) {
  const [isPending, startTransition] = useTransition()
  const [moderationReason, setModerationReason] = useState('')
  const [showReasonInput, setShowReasonInput] = useState<'hide' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function act(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.success) setError(result.error ?? 'Erreur')
      else {
        setShowReasonInput(null)
        setModerationReason('')
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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
            {review.status}
          </span>
          <span className="text-xs text-gray-400">→ {review.sellerName}</span>
        </div>
        <time className="text-xs text-gray-400">
          {review.createdAt.toLocaleDateString('fr-FR')}
        </time>
      </div>

      {review.comment && (
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{review.comment}</p>
      )}
      {review.reportReason && (
        <p className="mt-1 text-xs text-amber-600">Signalement : {review.reportReason}</p>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {review.status !== 'published' && (
          <button
            onClick={() => act(() => publishReview(review.id))}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            Publier
          </button>
        )}
        {review.status !== 'hidden' && (
          <button
            onClick={() => setShowReasonInput('hide')}
            disabled={isPending}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Masquer
          </button>
        )}
        <button
          onClick={() => setShowReasonInput('delete')}
          disabled={isPending}
          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Supprimer
        </button>
      </div>

      {/* Reason input for hide/delete */}
      {showReasonInput && (
        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            maxLength={500}
            value={moderationReason}
            onChange={(e) => setModerationReason(e.target.value)}
            placeholder="Motif obligatoire…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (showReasonInput === 'hide') act(() => hideReview(review.id, moderationReason))
                else act(() => deleteReview(review.id, moderationReason))
              }}
              disabled={isPending || !moderationReason.trim()}
              className={`rounded-lg px-3 py-1 text-xs font-semibold text-white disabled:opacity-50 ${showReasonInput === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-800'}`}
            >
              {isPending
                ? '…'
                : showReasonInput === 'hide'
                  ? 'Confirmer masquage'
                  : 'Confirmer suppression'}
            </button>
            <button
              onClick={() => {
                setShowReasonInput(null)
                setModerationReason('')
              }}
              className="text-xs text-gray-400 hover:underline"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
