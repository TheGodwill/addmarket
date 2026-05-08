'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'

const DISMISSED_KEY = 'addmarket_beta_banner_v1'

export function BetaBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = () => setVisible(true)
    if (!sessionStorage.getItem(DISMISSED_KEY)) show()
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="relative bg-blue-600 px-4 py-2 text-center text-sm text-white">
      <span>
        Version bêta — Aidez-nous à améliorer ADDMarket.{' '}
        <Link
          href="/contact"
          className="font-medium underline underline-offset-2 hover:text-blue-100"
        >
          Envoyer un retour
        </Link>
        <span className="mx-2 opacity-50">·</span>
        <Link
          href="/changelog"
          className="font-medium underline underline-offset-2 hover:text-blue-100"
        >
          Nouveautés
        </Link>
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer la bannière bêta"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
