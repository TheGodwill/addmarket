'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/app/auth/actions'
import { FormError, FormSuccess } from './form-error'
import { PasswordStrengthMeter } from './password-strength-meter'

const initialState = null

export function SignUpForm() {
  const [state, action, isPending] = useActionState(signUp, initialState)
  const [password, setPassword] = useState('')

  const error = state && 'error' in state ? state.error : null
  const success = state && 'success' in state ? state.success : null

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Créer un compte</h2>
        <p className="mt-1 text-sm text-gray-500">Rejoignez la communauté ADDMarket</p>
      </div>

      <FormError message={error} />
      <FormSuccess message={success} />

      {!success && (
        <>
          <div className="space-y-1">
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Nom affiché
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Jean Dupont"
              suppressHydrationWarning
            />
          </div>

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
              suppressHydrationWarning
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
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
              suppressHydrationWarning
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
              suppressHydrationWarning
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? 'Inscription…' : "S'inscrire"}
          </button>
        </>
      )}

      <p className="text-center text-sm text-gray-500">
        Déjà un compte ?{' '}
        <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
          Se connecter
        </Link>
      </p>
    </form>
  )
}
