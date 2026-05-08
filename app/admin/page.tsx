import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/db/client'
import {
  profiles,
  verificationRequests,
  moderationReports,
  churches,
  listings,
  auditLog,
  sellerProfiles,
} from '@/db/schema'
import { count, desc, eq, or, sql } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Administration — ADDMarket' }

export const revalidate = 60

async function getStats() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    membersVerified,
    membersPending,
    membersTotal,
    verifPending,
    verifApproved30d,
    reportsOpen,
    churchesActive,
    listingsActive,
    sellersActive,
    recentAudit,
  ] = await Promise.all([
    db
      .select({ n: count(profiles.id) })
      .from(profiles)
      .where(eq(profiles.membershipStatus, 'verified'))
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db
      .select({ n: count(profiles.id) })
      .from(profiles)
      .where(eq(profiles.membershipStatus, 'pending'))
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db
      .select({ n: count(profiles.id) })
      .from(profiles)
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db
      .select({ n: count(verificationRequests.id) })
      .from(verificationRequests)
      .where(eq(verificationRequests.status, 'pending'))
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db
      .select({ n: count(verificationRequests.id) })
      .from(verificationRequests)
      .where(
        sql`${verificationRequests.status} = 'approved' AND ${verificationRequests.processedAt} >= ${since30d}`,
      )
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db
      .select({ n: count(moderationReports.id) })
      .from(moderationReports)
      .where(or(eq(moderationReports.status, 'new'), eq(moderationReports.status, 'in_review')))
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db
      .select({ n: count(churches.id) })
      .from(churches)
      .where(eq(churches.isActive, true))
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db
      .select({ n: count(listings.id) })
      .from(listings)
      .where(eq(listings.status, 'active'))
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db
      .select({ n: count(sellerProfiles.id) })
      .from(sellerProfiles)
      .then((r) => Number(r.at(0)?.n ?? 0)),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(8),
  ])

  return {
    membersVerified,
    membersPending,
    membersTotal,
    verifPending,
    verifApproved30d,
    reportsOpen,
    churchesActive,
    listingsActive,
    sellersActive,
    recentAudit,
  }
}

function StatCard({
  label,
  value,
  sub,
  href,
  urgent,
}: {
  label: string
  value: number | string
  sub?: string
  href?: string
  urgent?: boolean
}) {
  const inner = (
    <div
      className={`rounded-xl border p-5 shadow-sm ${urgent && Number(value) > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${urgent && Number(value) > 0 ? 'text-red-700' : 'text-gray-900'}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default async function AdminDashboardPage() {
  const s = await getStats()

  const verificationRate =
    s.membersTotal > 0 ? Math.round((s.membersVerified / s.membersTotal) * 100) : 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

      {/* Urgent actions */}
      {(s.verifPending > 0 || s.reportsOpen > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Actions requises</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {s.verifPending > 0 && (
              <Link
                href="/admin/verifications"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                {s.verifPending} vérification{s.verifPending > 1 ? 's' : ''} en attente →
              </Link>
            )}
            {s.reportsOpen > 0 && (
              <Link
                href="/moderation/reports"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                {s.reportsOpen} signalement{s.reportsOpen > 1 ? 's' : ''} ouvert
                {s.reportsOpen > 1 ? 's' : ''} →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Membres
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total membres" value={s.membersTotal} />
          <StatCard
            label="Membres vérifiés"
            value={s.membersVerified}
            sub={`${verificationRate} % du total`}
          />
          <StatCard label="En attente" value={s.membersPending} sub="non encore vérifiés" />
          <StatCard label="Approuvés ce mois" value={s.verifApproved30d} sub="30 derniers jours" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Contenu & modération
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Vérifications en attente"
            value={s.verifPending}
            href="/admin/verifications"
            urgent
          />
          <StatCard
            label="Signalements ouverts"
            value={s.reportsOpen}
            href="/moderation/reports"
            urgent
          />
          <StatCard label="Annonces actives" value={s.listingsActive} href="/admin/reviews" />
          <StatCard label="Vendeurs" value={s.sellersActive} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Données ADD
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <StatCard label="Églises référencées" value={s.churchesActive} sub="Côte d'Ivoire" />
        </div>
      </section>

      {/* Recent audit log */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Activité récente
          </h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {s.recentAudit.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{entry.action}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-400">
                    {entry.createdAt.toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
              {s.recentAudit.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-xs text-gray-400">
                    Aucune activité enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
