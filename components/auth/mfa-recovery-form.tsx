'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useRecoveryCodeAction } from '@/app/auth/mfa-actions'
import { FormError } from './form-error'

const initialState = null

export function MfaRecoveryForm() {
  const [state, action, isPending] = useActionState(useRecoveryCodeAction, initialState)
  const error = state && 'error' in state ? state.error : null

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Code de récupération</h2>
        <p className="mt-1 text-sm text-gray-500">
          Saisissez l&apos;un de vos codes de récupération à usage unique. La MFA sera désactivée et
          vous devrez la réactiver.
        </p>
      </div>

      <FormError message={error} />

      <div className="space-y-1">
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Code de récupération
        </label>
        <input
          id="code"
          name="code"
          type="text"
          autoComplete="off"
          required
          autoFocus
          className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="XXXXX-XXXXX"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
      >
        {isPending ? 'Vérification…' : 'Utiliser ce code'}
      </button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/auth/mfa" className="font-medium text-blue-600 hover:text-blue-500">
          Retour au code TOTP
        </Link>
      </p>
    </form>
  )
}
