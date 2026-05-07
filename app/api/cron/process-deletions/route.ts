import { type NextRequest, NextResponse } from 'next/server'
import { and, isNull, lte } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { accountDeletionRequests, auditLog } from '@/db/schema'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAccountDeletedEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
  }

  const now = new Date()

  const pending = await db
    .select()
    .from(accountDeletionRequests)
    .where(
      and(
        lte(accountDeletionRequests.scheduledFor, now),
        isNull(accountDeletionRequests.cancelledAt),
        isNull(accountDeletionRequests.completedAt),
      ),
    )

  logger.info({ count: pending.length }, '[cron/process-deletions] Comptes à supprimer')

  const admin = createAdminClient()
  const results = { processed: 0, errors: 0 }

  for (const req of pending) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(req.userId)
      const userEmail = userData?.user?.email ?? null
      const displayName =
        (userData?.user?.user_metadata?.display_name as string) ?? userEmail ?? 'Utilisateur'

      // 1. Anonymize audit_log entries before deletion (actor_id SET NULL via FK cascade,
      //    but we explicitly mark metadata so the intent is clear)
      await db
        .update(auditLog)
        .set({
          metadata: db
            .select()
            .from(auditLog)
            .where(eq(auditLog.actorId, req.userId))
            .limit(0) as unknown as Record<string, unknown>,
        })
        .where(eq(auditLog.actorId, req.userId))

      // Simpler: the SET NULL FK cascade on auth.users DELETE handles actor_id → NULL.
      // We just need to mark the deletion_request as completed before the user is deleted.

      // 2. Mark deletion request as completed (before deleting the user)
      await db
        .update(accountDeletionRequests)
        .set({ completedAt: now })
        .where(eq(accountDeletionRequests.id, req.id))

      // 3. Send final email (before deletion — we lose the email after)
      if (userEmail) {
        await sendAccountDeletedEmail(userEmail)
      }

      // 4. Delete user from Supabase Auth (cascades to profiles, verification_requests, etc.)
      const { error: deleteError } = await admin.auth.admin.deleteUser(req.userId)
      if (deleteError) {
        logger.error(
          { error: deleteError, userId: req.userId },
          '[cron/process-deletions] Erreur suppression utilisateur',
        )
        results.errors++
        continue
      }

      logger.info({ userId: req.userId, displayName }, '[cron/process-deletions] Compte supprimé')
      results.processed++
    } catch (err) {
      logger.error({ err, userId: req.userId }, '[cron/process-deletions] Erreur inattendue')
      results.errors++
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
