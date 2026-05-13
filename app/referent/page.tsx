import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { churchReferents, churches, verificationRequests, profiles } from '@/db/schema'
import { Clock, CheckCircle, AlertTriangle, Users, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Espace référent — ADDMarket' }

export default async function ReferentHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const referentRow = await db
    .select({ churchId: churchReferents.churchId, role: churchReferents.role })
    .from(churchReferents)
    .where(eq(churchReferents.userId, user.id))
    .limit(1)

  if (!referentRow[0]) redirect('/')

  const { churchId, role } = referentRow[0]

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const alertThreshold = new Date(now.getTime() - 72 * 3_600_000)
  const expiringThreshold = new Date(now.getTime() + 30 * 24 * 3_600_000)

  const [church, pendingRow, processedRow, alertRow, expiringRow, recentRows, profileRow] =
    await Promise.all([
      db
        .select({ name: churches.name, city: churches.city, region: churches.region })
        .from(churches)
        .where(eq(churches.id, churchId))
        .limit(1)
        .then((r) => r.at(0)),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(verificationRequests)
        .where(
          and(
            eq(verificationRequests.churchId, churchId),
            eq(verificationRequests.status, 'pending'),
          ),
        )
        .then((r) => r.at(0)),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(verificationRequests)
        .where(
          and(
            eq(verificationRequests.churchId, churchId),
            eq(verificationRequests.status, 'approved'),
            gt(verificationRequests.processedAt, startOfMonth),
          ),
        )
        .then((r) => r.at(0)),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(verificationRequests)
        .where(
          and(
            eq(verificationRequests.churchId, churchId),
            eq(verificationRequests.status, 'pending'),
            lt(verificationRequests.submittedAt, alertThreshold),
          ),
        )
        .then((r) => r.at(0)),

      // Members expiring soon (≤ 30 days)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(profiles)
        .where(
          and(
            eq(profiles.churchId, churchId),
            eq(profiles.membershipStatus, 'verified'),
            lt(profiles.expiresAt, expiringThreshold),
            gt(profiles.expiresAt, now),
          ),
        )
        .then((r) => r.at(0)),

      // Latest 5 requests for quick view
      db
        .select({
          id: verificationRequests.id,
          status: verificationRequests.status,
          submittedAt: verificationRequests.submittedAt,
          submissionDisplayName: verificationRequests.submissionDisplayName,
        })
        .from(verificationRequests)
        .where(eq(verificationRequests.churchId, churchId))
        .orderBy(desc(verificationRequests.submittedAt))
        .limit(5),

      db
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1)
        .then((r) => r.at(0)),
    ])

  const pending = pendingRow?.count ?? 0
  const processedThisMonth = processedRow?.count ?? 0
  const alerts = alertRow?.count ?? 0
  const expiring = expiringRow?.count ?? 0

  const STATUS_LABEL: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvée',
    rejected: 'Rejetée',
    cancelled: 'Annulée',
    waiting: "En attente d'action",
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: 'text-amber-700 bg-amber-50 border-amber-200',
    approved: 'text-green-700 bg-green-50 border-green-200',
    rejected: 'text-red-600 bg-red-50 border-red-200',
    cancelled: 'text-gray-500 bg-gray-50 border-gray-200',
    waiting: 'text-blue-700 bg-blue-50 border-blue-200',
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-gray-500">Espace référent</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {profileRow?.displayName ?? 'Référent'}
          </h1>
          {church && (
            <p className="mt-1 text-sm font-medium text-blue-700">
              {church.name}
              {church.city ? ` — ${church.city}` : ''}
              {church.region ? `, ${church.region}` : ''}
            </p>
          )}
          <p className="mt-0.5 text-xs capitalize text-gray-400">
            Rôle : {role === 'admin_local' ? 'Admin local' : 'Référent'}
          </p>
        </div>

        {/* Alert banner */}
        {alerts > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong>
                {alerts} demande{alerts > 1 ? 's' : ''}
              </strong>{' '}
              en attente depuis plus de 72 h — merci de les traiter en priorité.
            </span>
            <Link
              href="/referent/verifications?status=pending"
              className="ml-auto shrink-0 font-semibold underline hover:no-underline"
            >
              Voir →
            </Link>
          </div>
        )}

        {/* KPI cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: 'En attente',
              value: pending,
              icon: Clock,
              color: pending > 0 ? 'text-amber-600' : 'text-gray-400',
              href: '/referent/verifications?status=pending',
            },
            {
              label: 'Traitées ce mois',
              value: processedThisMonth,
              icon: CheckCircle,
              color: 'text-green-600',
              href: '/referent/verifications?status=approved',
            },
            {
              label: 'Alertes > 72 h',
              value: alerts,
              icon: AlertTriangle,
              color: alerts > 0 ? 'text-red-500' : 'text-gray-400',
              href: '/referent/verifications?status=pending',
            },
            {
              label: 'Expirent dans 30 j.',
              value: expiring,
              icon: Users,
              color: expiring > 0 ? 'text-orange-500' : 'text-gray-400',
              href: '/referent/verifications',
            },
          ].map(({ label, value, icon: Icon, color, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <Icon className={`mx-auto mb-1 h-5 w-5 ${color}`} aria-hidden />
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{label}</p>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/referent/verifications"
            className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-600 px-5 py-4 text-white hover:bg-blue-700"
          >
            <Clock className="h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Gérer les demandes</p>
              <p className="text-xs text-blue-100">Voir et traiter toutes les vérifications</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0" aria-hidden />
          </Link>
          <Link
            href="/referent/verifications?status=pending"
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-gray-700 hover:bg-gray-50"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            <div>
              <p className="font-semibold">Demandes en attente</p>
              <p className="text-xs text-gray-400">{pending} en attente de traitement</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          </Link>
        </div>

        {/* Recent requests */}
        {recentRows.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Dernières demandes</h2>
              <Link
                href="/referent/verifications"
                className="text-xs text-blue-600 hover:underline"
              >
                Toutes →
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {recentRows.map((req) => (
                <li key={req.id}>
                  <Link
                    href={`/referent/verifications/${req.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {req.submissionDisplayName ?? 'Membre anonyme'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {req.submittedAt.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[req.status] ?? ''}`}
                    >
                      {STATUS_LABEL[req.status] ?? req.status}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
