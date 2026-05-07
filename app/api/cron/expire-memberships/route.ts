import { type NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, lte } from 'drizzle-orm'
import { serverEnv } from '@/lib/env.server'
import { sendRenewalReminderEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'

// Triggered daily by Vercel Cron or external scheduler.
// Authorization: Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const secret = serverEnv.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const results = { expired: 0, reminders: { d30: 0, d15: 0, d7: 0 }, errors: 0 }

  try {
    // 1. Expire memberships past their expires_at
    const expired = await db
      .update(profiles)
      .set({ membershipStatus: 'expired', updatedAt: now })
      .where(and(eq(profiles.membershipStatus, 'verified'), lte(profiles.expiresAt, now)))
      .returning({ id: profiles.id })

    results.expired = expired.length
    if (expired.length > 0) {
      logger.info({ count: expired.length }, '[cron] Adhésions expirées')
    }

    // 2. Send renewal reminders at J-30, J-15, J-7
    const admin = createAdminClient()
    for (const daysLeft of [30, 15, 7] as const) {
      const windowStart = new Date(now.getTime() + (daysLeft - 1) * 24 * 3_600_000)
      const windowEnd = new Date(now.getTime() + daysLeft * 24 * 3_600_000)

      const upcoming = await db
        .select({
          id: profiles.id,
          displayName: profiles.displayName,
          expiresAt: profiles.expiresAt,
        })
        .from(profiles)
        .where(
          and(
            eq(profiles.membershipStatus, 'verified'),
            gt(profiles.expiresAt, windowStart),
            lte(profiles.expiresAt, windowEnd),
          ),
        )

      for (const p of upcoming) {
        try {
          const {
            data: { user },
          } = await admin.auth.admin.getUserById(p.id)
          if (user?.email && p.expiresAt) {
            await sendRenewalReminderEmail(user.email, p.displayName, p.expiresAt, daysLeft)
            results.reminders[`d${daysLeft}` as keyof typeof results.reminders]++
          }
        } catch (err) {
          logger.error({ err, userId: p.id }, '[cron] Échec rappel renouvellement')
          results.errors++
        }
      }
    }

    logger.info({ results }, '[cron] expire-memberships terminé')
    return NextResponse.json({ ok: true, results })
  } catch (err) {
    logger.error({ err }, '[cron] expire-memberships erreur critique')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
