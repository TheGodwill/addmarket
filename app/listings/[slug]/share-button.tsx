'use client'
import { useState } from 'react'

export function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
      aria-label="Copier le lien"
    >
      {copied ? '✓ Lien copié !' : 'Copier le lien'}
    </button>
  )
}
