'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { verifyMfaChallenge } from '@/app/auth/mfa-actions'
import { FormError } from './form-error'

const initialState = null

export function MfaChallengeForm() {
  const [state, action, isPending] = useActionState(verifyMfaChallenge, initialState)
  const error = state && 'error' in state ? state.error : null

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Vérification en deux étapes</h2>
        <p className="mt-1 text-sm text-gray-500">
          Saisissez le code à 6 chiffres affiché dans votre application d&apos;authentification.
        </p>
      </div>

      <FormError message={error} />

      <div className="space-y-1">
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Code d&apos;authentification
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-[0.5em] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="000000"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
      >
        {isPending ? 'Vérification…' : 'Vérifier'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Pas accès à votre application ?{' '}
        <Link href="/auth/mfa/recovery" className="font-medium text-blue-600 hover:text-blue-500">
          Utiliser un code de récupération
        </Link>
      </p>
    </form>
  )
}
