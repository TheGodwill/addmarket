import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { and, isNull } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { accountDeletionRequests } from '@/db/schema'
import { DeleteRequestForm } from './delete-form'

export const metadata: Metadata = { title: 'Supprimer mon compte — ADDMarket' }

export default async function DeleteAccountPage({
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
  const prefillCancelToken = sp.cancel_token ?? null

  // Find active pending deletion
  const pending = await db
    .select()
    .from(accountDeletionRequests)
    .where(
      and(
        eq(accountDeletionRequests.userId, user.id),
        isNull(accountDeletionRequests.cancelledAt),
        isNull(accountDeletionRequests.completedAt),
      ),
    )
    .limit(1)

  const pendingRequest = pending.at(0) ?? null

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Supprimer mon compte</h1>
      <p className="mb-8 text-sm text-gray-500">
        La suppression est irréversible. Un délai de 30 jours est appliqué pour vous permettre de
        changer d&apos;avis.
      </p>

      <DeleteRequestForm
        pendingRequest={
          pendingRequest
            ? {
                id: pendingRequest.id,
                scheduledFor: pendingRequest.scheduledFor.toISOString(),
              }
            : null
        }
        prefillCancelToken={prefillCancelToken}
      />
    </div>
  )
}
