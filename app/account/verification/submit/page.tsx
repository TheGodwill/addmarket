import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { verificationRequests } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { VerificationForm } from './verification-form'

export const metadata: Metadata = { title: 'Soumettre une vérification — ADDMarket' }

export default async function SubmitVerificationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Block if pending request already open
  const existing = await db
    .select({ status: verificationRequests.status })
    .from(verificationRequests)
    .where(eq(verificationRequests.userId, user.id))
    .orderBy(desc(verificationRequests.submittedAt))
    .limit(1)
    .then((r) => r.at(0))

  if (existing?.status === 'pending') {
    redirect('/account/verification')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Demande de vérification</h1>
        <Link href="/account/verification" className="text-sm text-blue-600 hover:underline">
          ← Retour
        </Link>
      </div>
      <VerificationForm />
    </div>
  )
}
