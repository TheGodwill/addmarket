'use client'

import { useActionState, useState } from 'react'
import { disableMfa } from '@/app/account/actions'
import { MfaSetup } from './mfa-setup'
import { FormError, FormSuccess } from '@/components/auth/form-error'

interface MfaStatusProps {
  enabled: boolean
  enabledAt: Date | null
  recoveryCodesRemaining: number
}

const initialState = null

export function MfaStatus({ enabled, enabledAt, recoveryCodesRemaining }: MfaStatusProps) {
  const [showSetup, setShowSetup] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [disableState, disableAction, isDisablePending] = useActionState(disableMfa, initialState)

  const disableError = disableState && 'error' in disableState ? disableState.error : null
  const disableSuccess = disableState && 'success' in disableState ? disableState.success : null

  if (disableSuccess) {
    return <FormSuccess message={disableSuccess} />
  }

  if (!enabled) {
    if (showSetup) {
      return (
        <MfaSetup
          onComplete={() => {
            setShowSetup(false)
            window.location.reload()
          }}
        />
      )
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Désactivée
          </span>
          <span className="text-sm text-gray-500">
            Votre compte n&apos;est pas protégé par la MFA.
          </span>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Activer la MFA
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Activée
        </span>
        {enabledAt && (
          <span className="text-sm text-gray-500">
            depuis le {new Date(enabledAt).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600">
        Codes de récupération restants :{' '}
        <span
          className={recoveryCodesRemaining <= 2 ? 'font-semibold text-amber-600' : 'font-semibold'}
        >
          {recoveryCodesRemaining} / 8
        </span>
        {recoveryCodesRemaining <= 2 && (
          <span className="ml-2 text-amber-600">— Pensez à en régénérer.</span>
        )}
      </p>

      {!showDisable ? (
        <button
          onClick={() => setShowDisable(true)}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Désactiver la MFA
        </button>
      ) : (
        <form
          action={disableAction}
          className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-medium text-red-700">
            Confirmez votre mot de passe pour désactiver la MFA.
          </p>
          <FormError message={disableError} />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Mot de passe actuel"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isDisablePending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isDisablePending ? 'Désactivation…' : 'Confirmer la désactivation'}
            </button>
            <button
              type="button"
              onClick={() => setShowDisable(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
