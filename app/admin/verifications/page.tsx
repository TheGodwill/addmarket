import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { desc, eq, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { churches, verificationRequests } from '@/db/schema'

export const metadata: Metadata = { title: 'Administration — Vérifications' }

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Access control: admin_national role in app_metadata
  const isAdmin = (user.app_metadata?.role ?? user.user_metadata?.role) === 'admin_national'
  if (!isAdmin) redirect('/')

  const sp = await searchParams
  const statusFilter = sp.status

  const rows = await db
    .select({
      id: verificationRequests.id,
      status: verificationRequests.status,
      submittedAt: verificationRequests.submittedAt,
      processedAt: verificationRequests.processedAt,
      submissionDisplayName: verificationRequests.submissionDisplayName,
      submissionCity: verificationRequests.submissionCity,
      cardNumberLast4: verificationRequests.cardNumberLast4,
      churchName: churches.name,
      churchCity: churches.city,
    })
    .from(verificationRequests)
    .innerJoin(churches, eq(verificationRequests.churchId, churches.id))
    .where(statusFilter ? eq(verificationRequests.status, statusFilter as 'pending') : undefined)
    .orderBy(desc(verificationRequests.submittedAt))
    .limit(100)

  // Stats per church
  const churchStats = await db
    .select({
      churchId: verificationRequests.churchId,
      churchName: churches.name,
      total: sql<number>`count(*)::int`,
      approved: sql<number>`count(*) filter (where ${verificationRequests.status} = 'approved')::int`,
      pending: sql<number>`count(*) filter (where ${verificationRequests.status} = 'pending')::int`,
    })
    .from(verificationRequests)
    .innerJoin(churches, eq(verificationRequests.churchId, churches.id))
    .groupBy(verificationRequests.churchId, churches.name)
    .orderBy(sql`count(*) desc`)
    .limit(20)

  const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvée',
    rejected: 'Rejetée',
    waiting: 'En attente info',
    cancelled: 'Annulée',
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    waiting: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Vérifications — Vue nationale</h1>

        {/* Church stats */}
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-700">Statistiques par église</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Église</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Approuvées</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">En attente</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">
                    Taux approbation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {churchStats.map((s) => (
                  <tr key={s.churchId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.churchName}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.total}</td>
                    <td className="px-4 py-3 text-right text-green-700">{s.approved}</td>
                    <td className="px-4 py-3 text-right text-yellow-700">{s.pending}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* All requests */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">Toutes les demandes</h2>
            <div className="flex gap-2">
              {['pending', 'approved', 'rejected', 'waiting'].map((s) => (
                <a
                  key={s}
                  href={`/admin/verifications?status=${s}`}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${statusFilter === s ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {STATUS_LABELS[s]}
                </a>
              ))}
              {statusFilter && (
                <a
                  href="/admin/verifications"
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Tout voir
                </a>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Membre</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Église</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Soumis le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.submissionDisplayName ?? '—'}</p>
                      <p className="text-xs text-gray-500">{r.submissionCity ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.churchName} <span className="text-gray-400">({r.churchCity})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.submittedAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
