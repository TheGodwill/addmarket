import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import { getModerationQueue } from '../reports/actions'

export const metadata: Metadata = { title: 'Modération — File de contrôle' }

export default async function ModerationQueuePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'moderation.read')) redirect('/')

  const queue = await getModerationQueue()
  if (!queue) redirect('/')

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">File de contrôle proactif</h1>
          <Link href="/moderation/reports" className="text-sm text-blue-600 hover:underline">
            ← Signalements
          </Link>
        </div>

        <p className="mb-6 text-sm text-gray-500">
          Contenus publiés dans les dernières 48 heures nécessitant un spot-check.
        </p>

        {/* New listings */}
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Nouvelles annonces ({queue.newListings.length})
          </h2>
          {queue.newListings.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune nouvelle annonce.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Titre</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Publié le</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queue.newListings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{listing.title}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {listing.createdAt.toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/listings/${listing.id}`}
                          target="_blank"
                          className="text-blue-600 hover:underline"
                        >
                          Vérifier →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* New sellers */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Nouveaux vendeurs ({queue.newSellers.length})
          </h2>
          {queue.newSellers.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun nouveau vendeur.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Vendeur</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Inscrit le</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queue.newSellers.map((seller) => (
                    <tr key={seller.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{seller.businessName}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {seller.createdAt.toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        {seller.slug && (
                          <Link
                            href={`/sellers/${seller.slug}`}
                            target="_blank"
                            className="text-blue-600 hover:underline"
                          >
                            Vérifier →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
