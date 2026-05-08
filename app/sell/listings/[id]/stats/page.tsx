import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { auditLog, listingViews } from '@/db/schema'
import { and, eq, desc, sql, gte } from 'drizzle-orm'
import { getListingForEdit } from '../../actions'
import { ViewsBarChart } from '@/components/charts/views-bar-chart'

export const metadata: Metadata = { title: 'Statistiques listing — ADDMarket' }

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

export default async function ListingStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const result = await getListingForEdit(id, user.id)
  if (!result) notFound()

  const { listing } = result

  // eslint-disable-next-line react-hooks/purity -- async server component, Date.now() is safe
  const nowMs = Date.now()
  const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000)

  const [auditRows, totalViewsRow, dailyViewRows] = await Promise.all([
    db
      .select({ action: auditLog.action, createdAt: auditLog.createdAt })
      .from(auditLog)
      .where(and(eq(auditLog.targetId, id), eq(auditLog.targetType, 'listing')))
      .orderBy(desc(auditLog.createdAt))
      .limit(20),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(listingViews)
      .where(eq(listingViews.listingId, id)),

    db
      .select({
        day: sql<string>`date_trunc('day', ${listingViews.viewedAt})::text`,
        views: sql<number>`count(*)::int`,
      })
      .from(listingViews)
      .where(and(eq(listingViews.listingId, id), gte(listingViews.viewedAt, thirtyDaysAgo)))
      .groupBy(sql`date_trunc('day', ${listingViews.viewedAt})`)
      .orderBy(sql`date_trunc('day', ${listingViews.viewedAt})`),
  ])

  const totalViews = totalViewsRow.at(0)?.total ?? 0
  const chartData = fillDailyGaps(
    dailyViewRows.map((r) => ({ day: r.day, views: Number(r.views) })),
    30,
  )
  const viewsLast30 = chartData.reduce((s, d) => s + d.views, 0)

  const statusLabel: Record<string, string> = {
    active: 'Actif',
    draft: 'Brouillon',
    paused: 'Pausé',
    removed: 'Supprimé',
  }

  const actionLabel: Record<string, string> = {
    'listing.create': 'Créé',
    'listing.update': 'Modifié',
    'listing.delete': 'Supprimé',
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Statistiques du listing</h1>
        <Link href="/sell/listings" className="text-sm text-blue-600 hover:underline">
          ← Mes listings
        </Link>
      </div>

      {/* Listing info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="font-semibold text-gray-900">{listing.title}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-3">
          <div>
            <span className="text-gray-400">Statut :</span>{' '}
            <span>{statusLabel[listing.status] ?? listing.status}</span>
          </div>
          <div>
            <span className="text-gray-400">Images :</span> <span>{result.images.length}</span>
          </div>
          <div>
            <span className="text-gray-400">Tags :</span> <span>{listing.tags.length}</span>
          </div>
          <div>
            <span className="text-gray-400">Créé le :</span>{' '}
            <span>{listing.createdAt.toLocaleDateString('fr-FR')}</span>
          </div>
          {listing.publishedAt && (
            <div>
              <span className="text-gray-400">Publié le :</span>{' '}
              <span>{listing.publishedAt.toLocaleDateString('fr-FR')}</span>
            </div>
          )}
        </div>
      </div>

      {/* View stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-blue-600">{totalViews}</p>
          <p className="mt-1 text-xs text-gray-500">Vues totales</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-blue-600">{viewsLast30}</p>
          <p className="mt-1 text-xs text-gray-500">Vues ces 30 jours</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Vues par jour (30 jours)</h2>
        <ViewsBarChart data={chartData} />
      </div>

      {/* Audit log */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Historique des modifications</h2>
        {auditRows.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun historique disponible.</p>
        ) : (
          <ul className="space-y-2">
            {auditRows.map((row, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{actionLabel[row.action] ?? row.action}</span>
                <span className="text-xs text-gray-400">
                  {row.createdAt.toLocaleString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Link
          href={`/sell/listings/${id}/edit`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Modifier ce listing
        </Link>
      </div>
    </div>
  )
}
