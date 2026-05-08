import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { auditLog } from '@/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getListingForEdit } from '../../actions'

export const metadata = { title: 'Statistiques listing — ADDMarket' }

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

  const auditRows = await db
    .select({ action: auditLog.action, createdAt: auditLog.createdAt })
    .from(auditLog)
    .where(and(eq(auditLog.targetId, id), eq(auditLog.targetType, 'listing')))
    .orderBy(desc(auditLog.createdAt))
    .limit(20)

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
          <div>
            <span className="text-gray-400">Modifié le :</span>{' '}
            <span>{listing.updatedAt.toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </div>

      {/* Analytics placeholder */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm font-medium text-gray-700">Analytiques détaillées</p>
        <p className="mt-1 text-xs text-gray-500">
          Le suivi des vues, contacts et apparitions dans les recherches sera disponible dans une
          prochaine version.
        </p>
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
