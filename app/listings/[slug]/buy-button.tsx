'use client'
import { useState } from 'react'

interface Props {
  listingId: string
  label: string // e.g. "Acheter — 29,90 €"
}

export function BuyButton({ listingId, label }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Erreur lors de la création du paiement')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Redirection…' : label}
      </button>
    </div>
  )
}
