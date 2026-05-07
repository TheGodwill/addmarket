'use client'

import { useState, useTransition, useRef } from 'react'
import { startMfaEnrollment, completeMfaEnrollment } from '@/app/account/actions'

type Step = 'idle' | 'scanning' | 'codes'
type EnrollData = { factorId: string; qrCode: string; secret: string }

interface MfaSetupProps {
  onComplete?: () => void
}

export function MfaSetup({ onComplete }: MfaSetupProps) {
  const [step, setStep] = useState<Step>('idle')
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const codeInputRef = useRef<HTMLInputElement>(null)

  function handleStart() {
    setError(null)
    startTransition(async () => {
      const result = await startMfaEnrollment()
      if ('error' in result) {
        setError(result.error)
      } else {
        setEnrollData(result)
        setStep('scanning')
      }
    })
  }

  function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!enrollData) return
    const code = codeInputRef.current?.value ?? ''
    setError(null)
    startTransition(async () => {
      const result = await completeMfaEnrollment(enrollData.factorId, code)
      if ('error' in result) {
        setError(result.error)
        if (codeInputRef.current) codeInputRef.current.value = ''
      } else {
        setRecoveryCodes(result.codes)
        setStep('codes')
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

  if (step === 'idle') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Activez la double authentification pour sécuriser votre compte avec une application comme
          Google Authenticator, Authy, ou 1Password.
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
          onClick={handleStart}
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? 'Chargement…' : 'Activer la MFA'}
        </button>
      </div>
    )
  }

  if (step === 'scanning' && enrollData) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-700">
            1. Scannez ce QR code avec votre application d&apos;authentification
          </p>
          <div
            className="mt-3 inline-block rounded-lg border border-gray-200 bg-white p-3"
            // QR code SVG inlined directly
            dangerouslySetInnerHTML={{ __html: enrollData.qrCode }}
            aria-label="QR code pour configurer la double authentification"
          />
        </div>

        <details className="text-sm text-gray-500">
          <summary className="cursor-pointer font-medium">
            Vous ne pouvez pas scanner ? Saisir la clé manuellement
          </summary>
          <p className="mt-2 break-all rounded-md bg-gray-50 p-3 font-mono text-xs">
            {enrollData.secret}
          </p>
        </details>

        <form onSubmit={handleVerify} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="totp-code" className="block text-sm font-medium text-gray-700">
              2. Saisissez le code affiché dans votre application
            </label>
            <input
              ref={codeInputRef}
              id="totp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-[0.5em] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="000000"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? 'Vérification…' : 'Confirmer et activer'}
          </button>
        </form>
      </div>
    )
  }

  if (step === 'codes' && recoveryCodes) {
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Important :</strong> Sauvegardez ces codes maintenant. Ils ne seront plus
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

  return null
}
