import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { getSignedPhotoUrl } from '@/lib/storage'
import { db } from '@/db/client'
import { churchReferents, verificationRequests } from '@/db/schema'
import { VerificationDetail } from '@/components/referent/verification-detail'

export const metadata: Metadata = { title: 'Détail de la demande' }

export default async function VerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  const referentRow = await db
    .select({ churchId: churchReferents.churchId })
    .from(churchReferents)
    .where(eq(churchReferents.userId, user.id))
    .limit(1)

  if (!referentRow[0]) redirect('/')
  const churchId = referentRow[0].churchId

  const req = await db
    .select()
    .from(verificationRequests)
    .where(and(eq(verificationRequests.id, id), eq(verificationRequests.churchId, churchId)))
    .limit(1)

  if (!req[0]) notFound()

  const r = req[0]

  // Signed URLs valid 1h (server-generated, never exposed in URL params)
  const [frontUrl, backUrl] = await Promise.all([
    r.cardPhotoStoragePath ? getSignedPhotoUrl(r.cardPhotoStoragePath) : null,
    r.cardPhotoBackStoragePath ? getSignedPhotoUrl(r.cardPhotoBackStoragePath) : null,
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <VerificationDetail
          request={{
            id: r.id,
            status: r.status,
            submittedAt: r.submittedAt.toISOString(),
            submissionDisplayName: r.submissionDisplayName,
            submissionCity: r.submissionCity,
            cardNumberLast4: r.cardNumberLast4,
            rejectionReasonCode: r.rejectionReasonCode,
            rejectionReason: r.rejectionReason,
          }}
          photoFrontUrl={frontUrl}
          photoBackUrl={backUrl}
          isSelf={r.userId === user.id}
        />
      </div>
    </main>
  )
}
