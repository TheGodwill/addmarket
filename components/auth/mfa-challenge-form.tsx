'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { verifyMfaChallenge, resendMfaOtp } from '@/app/auth/mfa-actions'
import { FormError, FormSuccess } from './form-error'

const initialState = null

export function MfaChallengeForm() {
  const [verifyState, verifyAction, isVerifyPending] = useActionState(
    verifyMfaChallenge,
    initialState,
  )
  const [resendState, resendAction, isResendPending] = useActionState(resendMfaOtp, initialState)

  const verifyError = verifyState && 'error' in verifyState ? verifyState.error : null
  const resendSuccess = resendState && 'success' in resendState ? resendState.success : null
  const resendError = resendState && 'error' in resendState ? resendState.error : null

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Vérification par email</h2>
        <p className="mt-1 text-sm text-gray-500">
          Un code à 6 chiffres a été envoyé à votre adresse email. Il est valable 10 minutes.
        </p>
      </div>

      <FormError message={verifyError} />
      <FormSuccess message={resendSuccess} />
      <FormError message={resendError} />

      <form action={verifyAction} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Code de vérification
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
          disabled={isVerifyPending}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {isVerifyPending ? 'Vérification…' : 'Vérifier'}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <form action={resendAction}>
          <button
            type="submit"
            disabled={isResendPending}
            className="text-blue-600 hover:text-blue-500 disabled:opacity-60"
          >
            {isResendPending ? 'Envoi…' : 'Renvoyer le code'}
          </button>
        </form>

        <Link href="/auth/mfa/recovery" className="text-gray-500 hover:text-gray-700">
          Utiliser un code de récupération
        </Link>
      </div>
    </div>
  )
}
