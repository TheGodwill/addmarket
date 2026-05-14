import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles, listings, sellerReviews, profiles, listingViews } from '@/db/schema'
import { eq, count, and, sql, gte, desc } from 'drizzle-orm'
import { ViewsBarChart } from '@/components/charts/views-bar-chart'

export const metadata: Metadata = { title: 'Tableau de bord vendeur — ADDMarket' }

// Fill gaps in daily view data with 0-view days
function fillDailyGaps(
  rows: { day: string; views: number }[],
  days: number,
): { day: string; views: number }[] {
  const map = new Map(rows.map((r) => [r.day.slice(0, 10), r.views]))
  const result: { day: string; views: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ day: key, views: map.get(key) ?? 0 })
  }
  return result
}

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

  const seller = await db
    .select()
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, user.id))
    .limit(1)
    .then((r) => r.at(0))

  if (!seller) redirect('/sell/onboarding')

  // eslint-disable-next-line react-hooks/purity -- async server component, Date.now() is safe
  const nowMs = Date.now()
  const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000)

  const [listingStats, reviewStats, profileRow, recentReviews] = await Promise.all([
    // Listing counts per status
    db
      .select({ status: listings.status, cnt: count() })
      .from(listings)
      .where(eq(listings.sellerId, seller.id))
      .groupBy(listings.status),

    // Published reviews + avg rating
    db
      .select({
        cnt: count(),
        avg: sql<number>`avg(${sellerReviews.rating})::numeric(3,2)`,
      })
      .from(sellerReviews)
      .where(and(eq(sellerReviews.sellerId, seller.id), eq(sellerReviews.status, 'published'))),

    // Membership expiry
    db
      .select({ expiresAt: profiles.expiresAt })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1),

    // Last 3 published reviews
    db
      .select({
        id: sellerReviews.id,
        rating: sellerReviews.rating,
        comment: sellerReviews.comment,
        createdAt: sellerReviews.createdAt,
      })
      .from(sellerReviews)
      .where(and(eq(sellerReviews.sellerId, seller.id), eq(sellerReviews.status, 'published')))
      .orderBy(desc(sellerReviews.createdAt))
      .limit(3),
  ])

  // listing_views-dependent queries — may fail if migration 0007 not yet applied in production
  let totalViews = 0
  let chartData: { day: string; views: number }[] = fillDailyGaps([], 30)
  let topListings: {
    id: string
    title: string
    slug: string | null
    status: string
    views: number
  }[] = []

  try {
    const [totalViewsRow, dailyViewRows, topListingsRows] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(listingViews)
        .innerJoin(listings, eq(listings.id, listingViews.listingId))
        .where(eq(listings.sellerId, seller.id)),

      db
        .select({
          day: sql<string>`date_trunc('day', ${listingViews.viewedAt})::text`,
          views: sql<number>`count(*)::int`,
        })
        .from(listingViews)
        .innerJoin(listings, eq(listings.id, listingViews.listingId))
        .where(and(eq(listings.sellerId, seller.id), gte(listingViews.viewedAt, thirtyDaysAgo)))
        .groupBy(sql`date_trunc('day', ${listingViews.viewedAt})`)
        .orderBy(sql`date_trunc('day', ${listingViews.viewedAt})`),

      db
        .select({
          id: listings.id,
          title: listings.title,
          slug: listings.slug,
          status: listings.status,
          views: sql<number>`count(${listingViews.id})::int`,
        })
        .from(listings)
        .leftJoin(listingViews, eq(listingViews.listingId, listings.id))
        .where(eq(listings.sellerId, seller.id))
        .groupBy(listings.id, listings.title, listings.slug, listings.status)
        .orderBy(sql`count(${listingViews.id}) DESC`)
        .limit(5),
    ])

    totalViews = totalViewsRow.at(0)?.total ?? 0
    chartData = fillDailyGaps(
      dailyViewRows.map((r) => ({ day: r.day, views: Number(r.views) })),
      30,
    )
    topListings = topListingsRows
  } catch {
    // listing_views table not yet available — show zeros until migration is applied
  }

  const activeListings = listingStats.find((s) => s.status === 'active')?.cnt ?? 0
  const draftListings = listingStats.find((s) => s.status === 'draft')?.cnt ?? 0
  const publishedReviews = reviewStats.at(0)?.cnt ?? 0
  const avgRating = reviewStats.at(0)?.avg ?? null
  const expiresAt = profileRow.at(0)?.expiresAt
  const viewsLast30 = chartData.reduce((s, d) => s + d.views, 0)

  const daysToExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - nowMs) / 86400000) : null

  const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    draft: 'bg-gray-100 text-gray-600',
    paused: 'bg-amber-100 text-amber-700',
    removed: 'bg-red-100 text-red-600',
  }
  const STATUS_LABEL: Record<string, string> = {
    active: 'Actif',
    draft: 'Brouillon',
    paused: 'Pausé',
    removed: 'Supprimé',
  }

  return (
    <div className="space-y-6">
      {params.created === '1' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Votre profil vendeur est en ligne ! Créez votre premier listing pour commencer à vendre.
        </div>
      )}

      {daysToExpiry !== null && daysToExpiry <= 60 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span>
            Votre adhésion expire dans <strong>{daysToExpiry} jours</strong>. Renouvelez-la pour
            maintenir votre profil visible.
          </span>
          <Link
            href="/sell/membership"
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Renouveler →
          </Link>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{seller.businessName}</h1>
        <p className="text-sm text-gray-500">Tableau de bord vendeur</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Vues totales',
            value: totalViews,
            sub: `${viewsLast30} ces 30 j.`,
            color: 'text-blue-600',
          },
          {
            label: 'Listings actifs',
            value: activeListings,
            sub: `${draftListings} brouillon(s)`,
            color: 'text-green-600',
          },
          {
            label: 'Note moyenne',
            value: avgRating !== null ? Number(avgRating).toFixed(1) : '—',
            sub: `${publishedReviews} avis`,
            color: 'text-amber-500',
          },
          {
            label: 'Messages',
            value: '',
            sub: 'Voir ma boîte',
            color: 'text-purple-600',
            href: '/messages',
          },
        ].map(({ label, value, sub, color, href }) =>
          href ? (
            <Link
              key={label}
              href={href}
              className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <p className={`text-3xl font-bold ${color}`}>✉</p>
              <p className="mt-1 text-xs font-medium text-gray-700">{label}</p>
              <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
            </Link>
          ) : (
            <div
              key={label}
              className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm"
            >
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="mt-1 text-xs font-medium text-gray-700">{label}</p>
              <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
            </div>
          ),
        )}
      </div>

      {/* Views chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Vues sur 30 jours</h2>
          <span className="text-xs text-gray-400">{viewsLast30} vues au total</span>
        </div>
        <ViewsBarChart data={chartData} />
      </div>

      {/* Top listings */}
      {topListings.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Top listings par vues</h2>
            <Link href="/sell/listings" className="text-xs text-blue-600 hover:underline">
              Tous mes listings →
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {topListings.map((l, i) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-400">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{l.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[l.status] ?? ''}`}
                >
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
                <span className="shrink-0 text-xs font-semibold text-blue-600">
                  {Number(l.views)} vue{Number(l.views) !== 1 ? 's' : ''}
                </span>
                <Link
                  href={`/sell/listings/${l.id}/stats`}
                  className="shrink-0 text-xs text-gray-400 hover:text-gray-700"
                >
                  Détails
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Avis récents</h2>
            <Link href="/sell/reviews" className="text-xs text-blue-600 hover:underline">
              Tous les avis →
            </Link>
          </div>
          <ul className="space-y-3">
            {recentReviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-amber-500">
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {r.createdAt.toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Actions rapides</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: '/sell/listings/new', icon: '➕', label: 'Créer un listing', accent: true },
            { href: '/sell/listings', icon: '📋', label: 'Gérer mes listings', accent: false },
            { href: '/sell/orders', icon: '🛒', label: 'Commandes & devis', accent: false },
            { href: '/sell/profile/edit', icon: '✏️', label: 'Modifier mon profil', accent: false },
            { href: '/sell/reviews', icon: '⭐', label: 'Voir mes avis', accent: false },
            { href: '/sell/membership', icon: '🪪', label: 'Mon adhésion', accent: false },
          ].map(({ href, icon, label, accent }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg border p-4 text-sm font-medium transition-colors ${
                accent
                  ? 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
