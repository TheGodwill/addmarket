'use server'
import { redirect } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { accountDeletionRequests } from '@/db/schema'
import { sendDeletionRequestEmail, sendDeletionCancelledEmail } from '@/lib/email'

type ActionResult = { error: string } | { success: true }

const COOLING_DAYS = 30

export async function requestDeletion(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check no active pending deletion
  const existing = await db
    .select({ id: accountDeletionRequests.id })
    .from(accountDeletionRequests)
    .where(
      and(
        eq(accountDeletionRequests.userId, user.id),
        isNull(accountDeletionRequests.cancelledAt),
        isNull(accountDeletionRequests.completedAt),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    return { error: 'Une demande de suppression est déjà en cours.' }
  }

  const scheduledFor = new Date(Date.now() + COOLING_DAYS * 24 * 3600_000)
  const cancelToken = crypto.randomUUID()

  await db.insert(accountDeletionRequests).values({
    userId: user.id,
    scheduledFor,
    cancelToken,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'
  const cancelUrl = `${appUrl}/account/delete?cancel_token=${cancelToken}`

  if (user.email) {
    await sendDeletionRequestEmail(
      user.email,
      user.user_metadata?.display_name ?? user.email,
      scheduledFor,
      cancelUrl,
    )
  }

  return { success: true }
}

export async function cancelDeletion(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cancelToken = formData.get('cancel_token') as string | null

  const whereClause = cancelToken
    ? and(
        eq(accountDeletionRequests.userId, user.id),
        eq(accountDeletionRequests.cancelToken, cancelToken),
        isNull(accountDeletionRequests.cancelledAt),
        isNull(accountDeletionRequests.completedAt),
      )
    : and(
        eq(accountDeletionRequests.userId, user.id),
        isNull(accountDeletionRequests.cancelledAt),
        isNull(accountDeletionRequests.completedAt),
      )

  const rows = await db
    .select({ id: accountDeletionRequests.id })
    .from(accountDeletionRequests)
    .where(whereClause)
    .limit(1)

  const row = rows.at(0)
  if (!row) {
    return { error: 'Aucune demande de suppression active trouvée.' }
  }

  await db
    .update(accountDeletionRequests)
    .set({ cancelledAt: new Date() })
    .where(eq(accountDeletionRequests.id, row.id))

  if (user.email) {
    await sendDeletionCancelledEmail(user.email, user.user_metadata?.display_name ?? user.email)
  }

  return { success: true }
}
