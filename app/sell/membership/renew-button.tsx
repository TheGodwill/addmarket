'use client'
import { useState } from 'react'

interface Props {
  amountFormatted: string
}

export function RenewButton({ amountFormatted }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/renew', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Erreur inattendue')
        setLoading(false)
      }
    } catch {
      setError('Erreur réseau')
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Redirection…' : `Renouveler mon adhésion — ${amountFormatted}`}
      </button>
    </div>
  )
}
