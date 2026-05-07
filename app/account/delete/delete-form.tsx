'use client'
import { useActionState } from 'react'
import { requestDeletion, cancelDeletion } from './actions'

interface PendingRequest {
  id: string
  scheduledFor: string
}

interface Props {
  pendingRequest: PendingRequest | null
  prefillCancelToken: string | null
}

export function DeleteRequestForm({ pendingRequest, prefillCancelToken }: Props) {
  const [requestState, requestAction, requestPending] = useActionState(requestDeletion, null)
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelDeletion, null)

  if (pendingRequest) {
    const date = new Date(pendingRequest.scheduledFor).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="mb-2 text-base font-semibold text-red-800">Suppression planifiée</h2>
          <p className="text-sm text-red-700">
            Votre compte sera supprimé le <strong>{date}</strong>. Toutes vos données seront
            définitivement effacées. Vous pouvez annuler jusqu&apos;à cette date.
          </p>
        </div>

        <form action={cancelAction}>
          {prefillCancelToken && (
            <input type="hidden" name="cancel_token" value={prefillCancelToken} />
          )}
          {cancelState && 'error' in cancelState && (
            <p className="mb-3 text-sm text-red-600">{cancelState.error}</p>
          )}
          {cancelState && 'success' in cancelState && (
            <p className="mb-3 text-sm text-green-600">
              Suppression annulée. Votre compte est conservé.
            </p>
          )}
          <button
            type="submit"
            disabled={cancelPending}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelPending ? 'Annulation...' : 'Annuler la suppression'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="mb-2 text-base font-semibold text-amber-800">Ce qui sera supprimé</h2>
        <ul className="space-y-1 text-sm text-amber-700">
          <li>• Votre profil et vos informations personnelles</li>
          <li>• Votre historique de vérification</li>
          <li>• Vos annonces et messages (Phase 2+)</li>
          <li>• Votre accès à la communauté ADDMarket</li>
        </ul>
        <p className="mt-3 text-sm text-amber-700">
          <strong>Conservé (anonymisé) :</strong> Les journaux d&apos;audit (obligation légale, 5
          ans) avec votre identité supprimée.
        </p>
      </div>

      <form action={requestAction}>
        {requestState && 'error' in requestState && (
          <p className="mb-3 text-sm text-red-600">{requestState.error}</p>
        )}
        {requestState && 'success' in requestState && (
          <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
            Demande enregistrée. Un email de confirmation a été envoyé avec un lien
            d&apos;annulation valable 30 jours.
          </div>
        )}
        <button
          type="submit"
          disabled={requestPending}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {requestPending ? 'En cours...' : 'Demander la suppression de mon compte'}
        </button>
      </form>
    </div>
  )
}
