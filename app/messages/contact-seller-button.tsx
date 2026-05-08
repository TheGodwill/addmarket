'use client'
import { useState } from 'react'
import { startConversation } from './[id]/actions'

interface Props {
  sellerProfileId: string
  listingId?: string
  sellerName: string
}

export function ContactSellerButton({ sellerProfileId, listingId, sellerName }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await startConversation(formData)
    setPending(false)
    if (result && 'error' in result) {
      setError(result.error)
    }
    // On success, startConversation redirects — nothing else to do
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Contacter {sellerName}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-gray-900">Votre message</p>
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      <form action={handleSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="sellerProfileId" value={sellerProfileId} />
        {listingId && <input type="hidden" name="listingId" value={listingId} />}
        <textarea
          name="body"
          rows={4}
          maxLength={2000}
          required
          placeholder="Bonjour, je suis intéressé(e) par…"
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
