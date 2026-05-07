'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  approveVerification,
  holdVerification,
  rejectVerification,
} from '@/app/referent/verifications/actions'
import { REJECTION_REASON_CODES, REJECTION_REASON_LABELS } from '@/db/schema'

interface RequestInfo {
  id: string
  status: string
  submittedAt: string
  submissionDisplayName: string | null
  submissionCity: string | null
  cardNumberLast4: string | null
  rejectionReasonCode: string | null
  rejectionReason: string | null
}

interface VerificationDetailProps {
  request: RequestInfo
  photoFrontUrl: string | null
  photoBackUrl: string | null
  isSelf: boolean
}

export function VerificationDetail({
  request: r,
  photoFrontUrl,
  photoBackUrl,
  isSelf,
}: VerificationDetailProps) {
  const [approveState, approveAction, isApprovePending] = useActionState(approveVerification, null)
  const [rejectState, rejectAction, isRejectPending] = useActionState(rejectVerification, null)
  const [holdState, holdAction, isHoldPending] = useActionState(holdVerification, null)
  const [showRejectForm, setShowRejectForm] = useState(false)

  const canAct = (r.status === 'pending' || r.status === 'waiting') && !isSelf

  const successMsg =
    (approveState && 'success' in approveState && approveState.success) ||
    (rejectState && 'success' in rejectState && rejectState.success) ||
    (holdState && 'success' in holdState && holdState.success) ||
    null

  const errorMsg =
    (approveState && 'error' in approveState && approveState.error) ||
    (rejectState && 'error' in rejectState && rejectState.error) ||
    (holdState && 'error' in holdState && holdState.error) ||
    null

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    waiting: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/referent/verifications" className="text-sm text-gray-500 hover:text-gray-700">
          ← Retour à la liste
        </Link>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {r.status}
        </span>
      </div>

      {successMsg && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {isSelf && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Vous ne pouvez pas traiter votre propre demande.
        </div>
      )}

      {/* Member info */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Informations du demandeur</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Nom affiché</dt>
            <dd className="font-medium text-gray-900">{r.submissionDisplayName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ville</dt>
            <dd className="font-medium text-gray-900">{r.submissionCity ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">N° carte (4 derniers)</dt>
            <dd className="font-mono font-medium text-gray-900">
              {r.cardNumberLast4 ? `****${r.cardNumberLast4}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Soumis le</dt>
            <dd className="font-medium text-gray-900">
              {new Date(r.submittedAt).toLocaleString('fr-FR')}
            </dd>
          </div>
        </dl>
      </div>

      {/* Photos */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Photos de la carte</h2>
        <div className="grid grid-cols-2 gap-4">
          {photoFrontUrl ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Recto
              </p>
              <a href={photoFrontUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoFrontUrl}
                  alt="Recto carte membre"
                  className="h-48 w-full rounded-md border border-gray-200 object-cover hover:opacity-90"
                />
              </a>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-sm text-gray-400">
              Recto supprimé
            </div>
          )}
          {photoBackUrl ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Verso
              </p>
              <a href={photoBackUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoBackUrl}
                  alt="Verso carte membre"
                  className="h-48 w-full rounded-md border border-gray-200 object-cover hover:opacity-90"
                />
              </a>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-sm text-gray-400">
              {r.status === 'approved' || r.status === 'rejected'
                ? 'Verso supprimé'
                : 'Pas de verso'}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">Les liens expirent dans 1 heure.</p>
      </div>

      {/* Actions */}
      {canAct && (
        <div className="space-y-3">
          {!showRejectForm && (
            <div className="flex gap-3">
              <form action={approveAction} className="flex-1">
                <input type="hidden" name="request_id" value={r.id} />
                <button
                  type="submit"
                  disabled={isApprovePending}
                  className="w-full rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {isApprovePending ? 'Approbation…' : 'Approuver'}
                </button>
              </form>
              <form action={holdAction}>
                <input type="hidden" name="request_id" value={r.id} />
                <button
                  type="submit"
                  disabled={isHoldPending || r.status === 'waiting'}
                  className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {isHoldPending ? '…' : 'En attente'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Rejeter
              </button>
            </div>
          )}

          {showRejectForm && (
            <form
              action={rejectAction}
              className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
            >
              <input type="hidden" name="request_id" value={r.id} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Motif du rejet *
                </label>
                <select
                  name="reason_code"
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="">Sélectionnez un motif</option>
                  {REJECTION_REASON_CODES.map((code) => (
                    <option key={code} value={code}>
                      {REJECTION_REASON_LABELS[code]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Précisions (optionnel)
                </label>
                <textarea
                  name="reason_free"
                  rows={3}
                  maxLength={500}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Informations supplémentaires…"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isRejectPending}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isRejectPending ? 'Rejet en cours…' : 'Confirmer le rejet'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {r.status === 'rejected' && r.rejectionReasonCode && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">
            Motif de rejet :{' '}
            {REJECTION_REASON_LABELS[
              r.rejectionReasonCode as keyof typeof REJECTION_REASON_LABELS
            ] ?? r.rejectionReasonCode}
          </p>
          {r.rejectionReason && <p className="mt-1 text-red-700">{r.rejectionReason}</p>}
        </div>
      )}
    </div>
  )
}
