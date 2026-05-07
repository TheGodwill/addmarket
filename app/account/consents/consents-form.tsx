'use client'
import { useActionState, useState } from 'react'
import { updateConsent, revokeAllConsents } from './actions'

interface ConsentItem {
  type: string
  label: string
  description: string
  granted: boolean
  updatedAt: string | null
}

export function ConsentsForm({ consentItems }: { consentItems: ConsentItem[] }) {
  const [updateState, updateAction] = useActionState(updateConsent, null)
  const [revokeState, revokeAction, revokePending] = useActionState(revokeAllConsents, null)
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>(
    Object.fromEntries(consentItems.map((c) => [c.type, c.granted])),
  )

  function handleToggle(type: string, currentValue: boolean) {
    setOptimistic((prev) => ({ ...prev, [type]: !currentValue }))
  }

  return (
    <div className="space-y-4">
      {consentItems.map((item) => {
        const granted = optimistic[item.type] ?? item.granted
        return (
          <div
            key={item.type}
            className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
              {item.updatedAt && (
                <p className="mt-1 text-xs text-gray-400">
                  Mis à jour le{' '}
                  {new Date(item.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <form action={updateAction} className="shrink-0">
              <input type="hidden" name="consent_type" value={item.type} />
              <input type="hidden" name="granted" value={String(!granted)} />
              <button
                type="submit"
                role="switch"
                aria-checked={granted}
                aria-label={`${item.label} : ${granted ? 'actif' : 'inactif'}`}
                onClick={() => handleToggle(item.type, granted)}
                className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${granted ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${granted ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </form>
          </div>
        )
      })}

      {updateState && 'error' in updateState && (
        <p className="text-sm text-red-600">{updateState.error}</p>
      )}

      <div className="border-t border-gray-100 pt-4">
        <form action={revokeAction}>
          {revokeState && 'success' in revokeState && (
            <p className="mb-2 text-sm text-green-600">Tous les consentements révoqués.</p>
          )}
          <button
            type="submit"
            disabled={revokePending}
            className="text-sm text-red-600 underline hover:text-red-700 disabled:opacity-50"
          >
            {revokePending ? 'En cours...' : 'Révoquer tous les consentements'}
          </button>
        </form>
      </div>
    </div>
  )
}
