'use client'

import { useState, useTransition } from 'react'
import { enableEmailOtp } from '@/app/account/actions'

interface MfaSetupProps {
  onComplete?: () => void
}

export function MfaSetup({ onComplete }: MfaSetupProps) {
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleEnable() {
    setError(null)
    startTransition(async () => {
      const result = await enableEmailOtp()
      if ('error' in result) {
        setError(result.error)
      } else {
        setRecoveryCodes(result.codes)
      }
    })
  }

  async function handleCopy() {
    if (!recoveryCodes) return
    await navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!recoveryCodes) return
    const blob = new Blob(
      [
        `Codes de récupération ADDMarket\nDate : ${new Date().toLocaleDateString('fr-FR')}\n\n${recoveryCodes.join('\n')}\n\nGardez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.`,
      ],
      { type: 'text/plain' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'addmarket-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (recoveryCodes) {
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          MFA activée. À chaque connexion, un code à 6 chiffres vous sera envoyé par email.
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Important :</strong> Sauvegardez ces codes de récupération. Ils ne seront plus
          affichés. Chaque code ne peut être utilisé qu&apos;une seule fois.
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <ul
            className="grid grid-cols-2 gap-1 font-mono text-sm"
            aria-label="Codes de récupération"
          >
            {recoveryCodes.map((code, i) => (
              <li key={i} className="text-gray-800">
                {code}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button
            onClick={handleDownload}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Télécharger (.txt)
          </button>
        </div>

        <button
          onClick={onComplete}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          J&apos;ai sauvegardé mes codes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Activez la double authentification par email. À chaque connexion, un code à 6 chiffres sera
        envoyé à votre adresse email.
      </p>
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <button
        onClick={handleEnable}
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? 'Activation…' : 'Activer la MFA par email'}
      </button>
    </div>
  )
}
