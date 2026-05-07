import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { churchReferents, churches, verificationRequests } from '@/db/schema'
import { VerificationList } from '@/components/referent/verification-list'
import { ReferentStats } from '@/components/referent/referent-stats'

export const metadata: Metadata = { title: 'Demandes de vérification' }

const PAGE_SIZE = 20

export default async function ReferentVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sp = await searchParams

  // Check referent access
  const referentRow = await db
    .select({ churchId: churchReferents.churchId })
    .from(churchReferents)
    .where(eq(churchReferents.userId, user.id))
    .limit(1)

  if (!referentRow[0]) redirect('/')

  const churchId = referentRow[0].churchId

  // Stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const alertThreshold = new Date(now.getTime() - 72 * 3_600_000)

  const [pending, processedThisMonth, alertRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRequests)
      .where(
        and(
          eq(verificationRequests.churchId, churchId),
          eq(verificationRequests.status, 'pending'),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRequests)
      .where(
        and(
          eq(verificationRequests.churchId, churchId),
          eq(verificationRequests.status, 'approved'),
          gt(verificationRequests.processedAt, startOfMonth),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationRequests)
      .where(
        and(
          eq(verificationRequests.churchId, churchId),
          eq(verificationRequests.status, 'pending'),
          lt(verificationRequests.submittedAt, alertThreshold),
        ),
      ),
  ])

  const stats = {
    pending: pending[0]?.count ?? 0,
    processedThisMonth: processedThisMonth[0]?.count ?? 0,
    alert: alertRows[0]?.count ?? 0,
  }

  // Filters
  const statusFilter = sp.status as string | undefined
  const cursor = sp.cursor as string | undefined

  const whereClause = and(
    eq(verificationRequests.churchId, churchId),
    statusFilter ? eq(verificationRequests.status, statusFilter as 'pending') : undefined,
    cursor ? lt(verificationRequests.submittedAt, new Date(cursor)) : undefined,
  )

  const rows = await db
    .select()
    .from(verificationRequests)
    .where(whereClause)
    .orderBy(desc(verificationRequests.submittedAt))
    .limit(PAGE_SIZE + 1)

  const hasMore = rows.length > PAGE_SIZE
  const requests = rows.slice(0, PAGE_SIZE)
  const nextCursor = hasMore ? requests[requests.length - 1]?.submittedAt?.toISOString() : undefined

  const church = await db
    .select({ name: churches.name, city: churches.city })
    .from(churches)
    .where(eq(churches.id, churchId))
    .limit(1)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Demandes de vérification</h1>
          {church[0] && (
            <p className="mt-1 text-sm text-gray-500">
              {church[0].name} — {church[0].city}
            </p>
          )}
        </div>
        <ReferentStats {...stats} />
        <div className="mt-6">
          <VerificationList
            requests={requests.map((r) => ({
              id: r.id,
              status: r.status,
              submittedAt: r.submittedAt.toISOString(),
              submissionDisplayName: r.submissionDisplayName,
              submissionCity: r.submissionCity,
              cardNumberLast4: r.cardNumberLast4,
              processedAt: r.processedAt?.toISOString() ?? null,
              isAlert: r.status === 'pending' && r.submittedAt.getTime() < alertThreshold.getTime(),
            }))}
            nextCursor={nextCursor}
            currentStatus={statusFilter}
          />
        </div>
      </div>
    </main>
  )
}
