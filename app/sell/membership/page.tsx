import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles, membershipOrders } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { RenewButton } from './renew-button'

export const metadata: Metadata = { title: 'Mon adhésion — ADDMarket' }

const MEMBERSHIP_PRICE_CENTS = parseInt(process.env.MEMBERSHIP_PRICE_CENTS ?? '12000', 10)

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
}
const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-600',
}

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRow, orders] = await Promise.all([
    db
      .select({ membershipStatus: profiles.membershipStatus, expiresAt: profiles.expiresAt })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)
      .then((r) => r.at(0)),
    db
      .select()
      .from(membershipOrders)
      .where(eq(membershipOrders.userId, user.id))
      .orderBy(desc(membershipOrders.createdAt))
      .limit(10),
  ])

  if (!profileRow) redirect('/')

  const { membershipStatus: status, expiresAt } = profileRow
  // eslint-disable-next-line react-hooks/purity -- async server component, Date.now() is safe
  const nowMs = Date.now()
  const daysToExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - nowMs) / 86400000) : null
  const isExpired = daysToExpiry !== null && daysToExpiry <= 0
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 60

  const amountFormatted = (MEMBERSHIP_PRICE_CENTS / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  })

  const canRenew = status === 'verified' || status === 'expired'

  return (
    <div className="space-y-6">
      {params.success === '1' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Renouvellement effectué ! Votre adhésion a été prolongée d&apos;un an.
        </div>
      )}
      {params.cancelled === '1' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Renouvellement annulé. Votre adhésion n&apos;a pas été modifiée.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mon adhésion</h1>
        <Link href="/sell/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      <div
        className={`rounded-xl border p-5 ${
          isExpired
            ? 'border-red-200 bg-red-50'
            : isExpiringSoon
              ? 'border-amber-200 bg-amber-50'
              : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Statut</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {status === 'verified' ? 'Actif' : status === 'expired' ? 'Expiré' : status}
            </p>
            {expiresAt && (
              <p
                className={`mt-1 text-sm ${
                  isExpired ? 'text-red-700' : isExpiringSoon ? 'text-amber-700' : 'text-gray-500'
                }`}
              >
                {isExpired ? 'Expiré le ' : 'Expire le '}
                {expiresAt.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {!isExpired && daysToExpiry !== null && (
                  <span className="ml-1 font-medium">({daysToExpiry} j.)</span>
                )}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium text-gray-500">Tarif annuel</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{amountFormatted}</p>
          </div>
        </div>

        {canRenew ? (
          <div className="mt-4">
            <RenewButton amountFormatted={amountFormatted} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Le renouvellement est disponible pour les adhésions actives ou expirées.
          </p>
        )}
      </div>

      {orders.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Historique des paiements</h2>
          <ul className="divide-y divide-gray-100">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Adhésion — {o.durationDays} jours</p>
                  <p className="text-xs text-gray-400">{o.createdAt.toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">
                    {(o.amountCents / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: o.currency.toUpperCase(),
                    })}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[o.status] ?? ''}`}
                  >
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
