'use client'
import { useState } from 'react'
import { submitQuoteRequest } from './actions'

interface Props {
  listingId: string
  sellerProfileId: string
}

export function QuoteForm({ listingId, sellerProfileId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await submitQuoteRequest(formData)
    setPending(false)
    if (result && 'error' in result) {
      setError(result.error)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-800">
        Demande de devis envoyée ! Le vendeur vous répondra prochainement.
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Demander un devis
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-gray-900">Votre demande de devis</p>
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      <form action={handleSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="sellerProfileId" value={sellerProfileId} />
        <textarea
          name="message"
          rows={4}
          minLength={10}
          maxLength={1000}
          required
          placeholder="Décrivez votre besoin, quantité souhaitée, délai…"
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </form>
    </div>
  )
}
