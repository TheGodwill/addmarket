import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { orders, listings, sellerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Commande — ADDMarket' }

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente de paiement',
  paid: 'Payé',
  failed: 'Paiement échoué',
  refunded: 'Remboursé',
  cancelled: 'Annulé',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  paid: 'text-green-700 bg-green-50 border-green-200',
  failed: 'text-red-600 bg-red-50 border-red-200',
  refunded: 'text-gray-600 bg-gray-100 border-gray-200',
  cancelled: 'text-gray-500 bg-gray-50 border-gray-200',
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const { id } = await params
  const qp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      amountCents: orders.amountCents,
      currency: orders.currency,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      buyerId: orders.buyerId,
      listingTitle: listings.title,
      listingId: listings.id,
      sellerName: sellerProfiles.businessName,
      sellerSlug: sellerProfiles.slug,
      sellerProfileId: orders.sellerProfileId,
    })
    .from(orders)
    .leftJoin(listings, eq(listings.id, orders.listingId))
    .leftJoin(sellerProfiles, eq(sellerProfiles.id, orders.sellerProfileId))
    .where(eq(orders.id, id))
    .limit(1)

  const order = orderRows.at(0)
  if (!order) notFound()

  // Only buyer or seller can see the order
  const sellerRow = await db
    .select({ userId: sellerProfiles.userId })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.id, order.sellerProfileId))
    .limit(1)
    .then((r) => r.at(0))

  const isParticipant = order.buyerId === user.id || sellerRow?.userId === user.id
  if (!isParticipant) notFound()

  const amount = (order.amountCents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: order.currency.toUpperCase(),
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {qp.success === '1' && order.status === 'paid' && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-800">
          Paiement réussi ! Votre commande a bien été enregistrée.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-lg font-bold text-gray-900">Récapitulatif de commande</h1>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Statut</dt>
            <dd>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[order.status] ?? ''}`}
              >
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </dd>
          </div>

          {order.listingTitle && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Produit</dt>
              <dd className="max-w-[60%] text-right font-medium text-gray-900">
                {order.listingId ? (
                  <Link href={`/listings/${order.listingId}`} className="hover:underline">
                    {order.listingTitle}
                  </Link>
                ) : (
                  order.listingTitle
                )}
              </dd>
            </div>
          )}

          <div className="flex justify-between">
            <dt className="text-gray-500">Vendeur</dt>
            <dd className="font-medium text-gray-900">
              {order.sellerSlug ? (
                <Link href={`/sellers/${order.sellerSlug}`} className="hover:underline">
                  {order.sellerName}
                </Link>
              ) : (
                order.sellerName
              )}
            </dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-gray-500">Montant</dt>
            <dd className="text-lg font-bold text-gray-900">{amount}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-gray-500">Date</dt>
            <dd className="text-gray-700">
              {order.createdAt.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </dd>
          </div>

          {order.paidAt && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Payé le</dt>
              <dd className="text-gray-700">{order.paidAt.toLocaleString('fr-FR')}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex gap-3">
          <Link
            href="/messages"
            className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-sm text-gray-600 hover:bg-gray-50"
          >
            Messagerie
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-lg bg-blue-600 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  )
}
