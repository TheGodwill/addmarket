import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { orders, quoteRequests, listings, profiles, sellerProfiles } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Commandes & devis — ADDMarket' }

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  refunded: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-500',
}
const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
  cancelled: 'Annulé',
}
const QUOTE_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  quoted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  expired: 'bg-gray-100 text-gray-500',
}
const QUOTE_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  quoted: 'Devis envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
}

export default async function SellerOrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const seller = await db
    .select({ id: sellerProfiles.id })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, user.id))
    .limit(1)
    .then((r) => r.at(0))

  if (!seller) redirect('/sell/onboarding')

  const [sellerOrders, sellerQuotes] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        amountCents: orders.amountCents,
        currency: orders.currency,
        createdAt: orders.createdAt,
        listingTitle: listings.title,
        buyerName: profiles.displayName,
      })
      .from(orders)
      .leftJoin(listings, eq(listings.id, orders.listingId))
      .leftJoin(profiles, eq(profiles.id, orders.buyerId))
      .where(eq(orders.sellerProfileId, seller.id))
      .orderBy(desc(orders.createdAt))
      .limit(50),

    db
      .select({
        id: quoteRequests.id,
        status: quoteRequests.status,
        message: quoteRequests.message,
        quotedPriceCents: quoteRequests.quotedPriceCents,
        createdAt: quoteRequests.createdAt,
        listingTitle: listings.title,
        buyerName: profiles.displayName,
      })
      .from(quoteRequests)
      .leftJoin(listings, eq(listings.id, quoteRequests.listingId))
      .leftJoin(profiles, eq(profiles.id, quoteRequests.buyerId))
      .where(eq(quoteRequests.sellerProfileId, seller.id))
      .orderBy(desc(quoteRequests.createdAt))
      .limit(50),
  ])

  const totalRevenue = sellerOrders
    .filter((o) => o.status === 'paid')
    .reduce((s, o) => s + o.amountCents, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Commandes & devis</h1>
        <Link href="/sell/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Revenu total',
            value: (totalRevenue / 100).toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            }),
            color: 'text-green-600',
          },
          {
            label: 'Commandes',
            value: sellerOrders.length,
            color: 'text-blue-600',
          },
          {
            label: 'Devis reçus',
            value: sellerQuotes.length,
            color: 'text-purple-600',
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm"
          >
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Commandes</h2>
        {sellerOrders.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            Aucune commande pour l&apos;instant.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Produit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Acheteur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellerOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-gray-900">
                      {o.listingTitle ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.buyerName ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {(o.amountCents / 100).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: o.currency.toUpperCase(),
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[o.status] ?? ''}`}
                      >
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {o.createdAt.toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Détails
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quote requests */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Demandes de devis</h2>
        {sellerQuotes.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            Aucune demande de devis pour l&apos;instant.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {sellerQuotes.map((q) => (
              <li key={q.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {q.listingTitle ?? 'Sans listing'}{' '}
                      <span className="font-normal text-gray-400">— {q.buyerName ?? '?'}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">{q.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${QUOTE_STATUS_BADGE[q.status] ?? ''}`}
                    >
                      {QUOTE_STATUS_LABEL[q.status] ?? q.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {q.createdAt.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                {q.quotedPriceCents != null && (
                  <p className="mt-1 text-xs text-green-700">
                    Devis envoyé :{' '}
                    {(q.quotedPriceCents / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
