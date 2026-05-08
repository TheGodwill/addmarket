'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function HeroSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
    router.push(`/search${qs}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un produit, un service…"
        className="flex-1 rounded-xl border border-blue-300 bg-white/90 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        autoComplete="off"
      />
      <button
        type="submit"
        className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
      >
        Rechercher
      </button>
    </form>
  )
}
