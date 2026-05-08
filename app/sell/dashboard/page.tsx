import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles, listings, sellerReviews, profiles } from '@/db/schema'
import { eq, count, and } from 'drizzle-orm'

export const metadata = { title: 'Tableau de bord vendeur — ADDMarket' }

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sellerRows = await db
    .select()
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, user.id))
    .limit(1)

  const seller = sellerRows.at(0)
  if (!seller) redirect('/sell/onboarding')

  const [listingStats, reviewStats, profileRows] = await Promise.all([
    db
      .select({ status: listings.status, count: count() })
      .from(listings)
      .where(eq(listings.sellerId, seller.id))
      .groupBy(listings.status),
    db
      .select({ count: count() })
      .from(sellerReviews)
      .where(and(eq(sellerReviews.sellerId, seller.id), eq(sellerReviews.status, 'published'))),
    db
      .select({ expiresAt: profiles.expiresAt })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1),
  ])

  const activeListings = listingStats.find((s) => s.status === 'active')?.count ?? 0
  const draftListings = listingStats.find((s) => s.status === 'draft')?.count ?? 0
  const publishedReviews = reviewStats.at(0)?.count ?? 0
  const expiresAt = profileRows.at(0)?.expiresAt

  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is safe at request time
  const now = Date.now()
  const daysToExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - now) / 86400000) : null

  return (
    <div className="space-y-6">
      {params.created === '1' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          🎉 Votre profil vendeur est en ligne ! Créez votre premier listing pour commencer à
          vendre.
        </div>
      )}

      {daysToExpiry !== null && daysToExpiry <= 60 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ Votre adhésion expire dans <strong>{daysToExpiry} jours</strong>. Renouvelez-la pour
          maintenir votre profil visible.
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {seller.businessName}</h1>
        <p className="text-sm text-gray-500">Tableau de bord vendeur</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Listings actifs', value: activeListings, color: 'text-green-600' },
          { label: 'Brouillons', value: draftListings, color: 'text-gray-500' },
          { label: 'Avis publiés', value: publishedReviews, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm"
          >
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Actions rapides</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/sell/listings/new"
            className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <span className="text-lg">➕</span>
            <span>Créer un listing</span>
          </Link>
          <Link
            href="/sell/listings"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="text-lg">📋</span>
            <span>Gérer mes listings</span>
          </Link>
          <Link
            href="/sell/profile/edit"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="text-lg">✏️</span>
            <span>Modifier mon profil</span>
          </Link>
          <Link
            href="/sell/reviews"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="text-lg">⭐</span>
            <span>Voir mes avis</span>
          </Link>
        </div>
      </div>

      {/* Profile summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold text-gray-900">Mon profil</h2>
          <Link href="/sell/profile/edit" className="text-sm text-blue-600 hover:underline">
            Modifier
          </Link>
        </div>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          {seller.contactEmail && (
            <p>
              <span className="text-gray-400">Email :</span> {seller.contactEmail}
            </p>
          )}
          {seller.contactPhone && (
            <p>
              <span className="text-gray-400">Téléphone :</span> {seller.contactPhone}
            </p>
          )}
          {seller.serviceCities.length > 0 && (
            <p>
              <span className="text-gray-400">Zones :</span>{' '}
              {seller.serviceCities.slice(0, 3).join(', ')}
              {seller.serviceCities.length > 3 && ` +${seller.serviceCities.length - 3}`}
            </p>
          )}
          <p>
            <span className="text-gray-400">Statut :</span>{' '}
            <span className={seller.isActive ? 'text-green-600' : 'text-red-600'}>
              {seller.isActive ? 'Actif' : 'Inactif'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
