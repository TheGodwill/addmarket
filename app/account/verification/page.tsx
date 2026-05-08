import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles, verificationRequests, churches } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { REJECTION_REASON_LABELS } from '@/db/schema/verification-requests'
import { CancelButton } from './cancel-button'

export const metadata: Metadata = { title: 'Ma vérification — ADDMarket' }

const STATUS_LABEL: Record<string, string> = {
  pending: 'En cours de traitement',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  cancelled: 'Annulée',
  waiting: "En attente d'action",
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-green-200 bg-green-50 text-green-800',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-gray-200 bg-gray-50 text-gray-600',
  waiting: 'border-blue-200 bg-blue-50 text-blue-800',
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profile, latestRequest] = await Promise.all([
    db
      .select({ membershipStatus: profiles.membershipStatus, expiresAt: profiles.expiresAt })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)
      .then((r) => r.at(0)),
    db
      .select({
        id: verificationRequests.id,
        status: verificationRequests.status,
        submittedAt: verificationRequests.submittedAt,
        rejectionReasonCode: verificationRequests.rejectionReasonCode,
        rejectionReason: verificationRequests.rejectionReason,
        resubmitAfter: verificationRequests.resubmitAfter,
        churchId: verificationRequests.churchId,
        churchName: churches.name,
        churchCity: churches.city,
      })
      .from(verificationRequests)
      .leftJoin(churches, eq(churches.id, verificationRequests.churchId))
      .where(eq(verificationRequests.userId, user.id))
      .orderBy(desc(verificationRequests.submittedAt))
      .limit(1)
      .then((r) => r.at(0)),
  ])

  const canSubmit =
    !latestRequest || latestRequest.status === 'rejected' || latestRequest.status === 'cancelled'

  const resubmitBlocked = latestRequest?.resubmitAfter && latestRequest.resubmitAfter > new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Vérification de membre</h1>
        <Link href="/account" className="text-sm text-blue-600 hover:underline">
          ← Mon compte
        </Link>
      </div>

      {params.submitted === '1' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Demande soumise ! Notre équipe examine votre dossier sous 72 h.
        </div>
      )}

      {/* Membership status banner */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-500">Statut adhésion</p>
        <p className="mt-1 text-lg font-bold text-gray-900">
          {profile?.membershipStatus === 'verified'
            ? `Vérifié${profile.expiresAt ? ` — expire le ${profile.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`
            : profile?.membershipStatus === 'expired'
              ? 'Expiré'
              : profile?.membershipStatus === 'suspended'
                ? 'Suspendu'
                : 'En attente de vérification'}
        </p>
      </div>

      {/* Latest request */}
      {latestRequest && (
        <div
          className={`rounded-xl border p-5 ${STATUS_COLOR[latestRequest.status] ?? 'border-gray-200 bg-white'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">
                {STATUS_LABEL[latestRequest.status] ?? latestRequest.status}
              </p>
              {latestRequest.churchName && (
                <p className="mt-1 text-sm">
                  {latestRequest.churchName}
                  {latestRequest.churchCity ? ` — ${latestRequest.churchCity}` : ''}
                </p>
              )}
              <p className="mt-1 text-xs opacity-70">
                Soumise le{' '}
                {latestRequest.submittedAt.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            {latestRequest.status === 'pending' && <CancelButton requestId={latestRequest.id} />}
          </div>

          {latestRequest.status === 'rejected' && latestRequest.rejectionReasonCode && (
            <div className="mt-3 text-sm">
              <p className="font-medium">
                Motif :{' '}
                {REJECTION_REASON_LABELS[
                  latestRequest.rejectionReasonCode as keyof typeof REJECTION_REASON_LABELS
                ] ?? latestRequest.rejectionReasonCode}
              </p>
              {latestRequest.rejectionReason && (
                <p className="mt-1 opacity-80">{latestRequest.rejectionReason}</p>
              )}
            </div>
          )}

          {resubmitBlocked && (
            <p className="mt-3 text-sm">
              Nouvelle soumission possible à partir du{' '}
              {latestRequest.resubmitAfter?.toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      )}

      {/* Submit / re-submit */}
      {canSubmit && !resubmitBlocked && (
        <Link
          href="/account/verification/submit"
          className="block rounded-xl border border-blue-200 bg-blue-600 p-4 text-center text-sm font-semibold text-white hover:bg-blue-700"
        >
          {latestRequest ? 'Soumettre à nouveau' : 'Soumettre ma demande de vérification'}
        </Link>
      )}

      {!latestRequest && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-600">
          <p className="font-medium text-gray-800">Comment ça marche ?</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Sélectionnez votre église Assemblée de Dieu.</li>
            <li>Photographiez votre carte de membre (recto obligatoire, verso recommandé).</li>
            <li>Le référent de votre église examine et approuve votre demande sous 72 h.</li>
          </ol>
        </div>
      )}
    </div>
  )
}
