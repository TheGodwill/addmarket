'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/app/auth/actions'
import { FormError, FormSuccess } from './form-error'

const initialState = null

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(requestPasswordReset, initialState)

  const error = state && 'error' in state ? state.error : null
  const success = state && 'success' in state ? state.success : null

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Mot de passe oublié</h2>
        <p className="mt-1 text-sm text-gray-500">
          Saisissez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <FormError message={error} />
      <FormSuccess message={success} />

      {!success && (
        <>
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="vous@exemple.fr"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </>
      )}

      <p className="text-center text-sm text-gray-500">
        <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
          Retour à la connexion
        </Link>
      </p>
    </form>
  )
}
