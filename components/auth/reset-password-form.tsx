'use client'

import { useActionState, useState } from 'react'
import { resetPassword } from '@/app/auth/actions'
import { FormError, FormSuccess } from './form-error'
import { PasswordStrengthMeter } from './password-strength-meter'

const initialState = null

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(resetPassword, initialState)
  const [password, setPassword] = useState('')

  const error = state && 'error' in state ? state.error : null
  const success = state && 'success' in state ? state.success : null

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Nouveau mot de passe</h2>
        <p className="mt-1 text-sm text-gray-500">Choisissez un mot de passe sécurisé.</p>
      </div>

      <FormError message={error} />
      <FormSuccess message={success} />

      {!success && (
        <>
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <PasswordStrengthMeter password={password} />
            <p className="text-xs text-gray-500">12 car. min · maj · min · chiffre · spécial</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
        </>
      )}
    </form>
  )
}
