import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSellerListingsForPage } from './actions'
import type { ListingFilter } from './actions'

export const metadata = { title: 'Mes listings — ADDMarket' }

const STATUS_LABELS: Record<string, string> = {
  all: 'Tous',
  active: 'Actifs',
  draft: 'Brouillons',
  paused: 'Pausés',
  removed: 'Supprimés',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  paused: 'bg-amber-100 text-amber-700',
  removed: 'bg-red-100 text-red-600',
}

function formatPrice(priceCents: number | null, isQuoteOnly: boolean) {
  if (isQuoteOnly) return 'Sur devis'
  if (priceCents == null) return '—'
  return `${(priceCents / 100).toFixed(2)} €`
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    search?: string
    sort?: string
    dir?: string
    page?: string
    saved?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const statusValues = ['all', 'active', 'draft', 'paused', 'removed'] as const
  type StatusValue = (typeof statusValues)[number]
  const status = (statusValues as readonly string[]).includes(params.status ?? '')
    ? (params.status as StatusValue)
    : 'all'

  const filter: ListingFilter = {
    status,
    ...(params.search ? { search: params.search } : {}),
    sortBy: params.sort === 'updated' ? 'updated' : params.sort === 'title' ? 'title' : 'created',
    sortDir: params.dir === 'asc' ? 'asc' : 'desc',
    page: params.page ? Math.max(1, parseInt(params.page, 10)) : 1,
    perPage: 20,
  }

  const { rows, total } = await getSellerListingsForPage(user.id, filter)
  const totalPages = Math.ceil(total / 20)
  const currentPage = filter.page ?? 1

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(status !== 'all' ? { status } : {}),
      ...(params.search ? { search: params.search } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.dir ? { dir: params.dir } : {}),
      ...overrides,
    })
    return `/sell/listings?${p.toString()}`
  }

  return (
    <div className="space-y-5">
      {params.saved === '1' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Listing enregistré avec succès.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Mes listings</h1>
        <Link
          href="/sell/listings/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouveau listing
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusValues.map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, page: '1' })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="get" action="/sell/listings" className="flex gap-2">
        {status !== 'all' && <input type="hidden" name="status" value={status} />}
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Rechercher par titre…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Chercher
        </button>
      </form>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-500">Aucun listing trouvé.</p>
          <Link
            href="/sell/listings/new"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
          >
            Créer votre premier listing →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Titre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Prix</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  <Link
                    href={buildHref({
                      sort: 'created',
                      dir: params.dir === 'asc' ? 'desc' : 'asc',
                    })}
                  >
                    Créé{' '}
                    {params.sort === 'created' || !params.sort
                      ? params.dir === 'asc'
                        ? '↑'
                        : '↓'
                      : ''}
                  </Link>
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((listing) => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="max-w-[280px] px-4 py-3">
                    <p className="truncate font-medium text-gray-900">{listing.title}</p>
                    {listing.tags.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {listing.tags.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatPrice(listing.priceCents, listing.isQuoteOnly)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[listing.status] ?? ''}`}
                    >
                      {STATUS_LABELS[listing.status] ?? listing.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {listing.createdAt.toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/sell/listings/${listing.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        Modifier
                      </Link>
                      <Link
                        href={`/sell/listings/${listing.id}/stats`}
                        className="text-gray-500 hover:underline"
                      >
                        Stats
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref({ page: String(p) })}
              className={`rounded px-3 py-1 text-sm ${
                p === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">{total} listing(s) au total</p>
    </div>
  )
}
