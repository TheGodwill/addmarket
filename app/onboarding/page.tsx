import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'

export const metadata: Metadata = { title: 'Vérification de compte' }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const profile = await db
    .select({
      onboardingCompletedAt: profiles.onboardingCompletedAt,
      membershipStatus: profiles.membershipStatus,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  // Already completed — redirect home (proxy cookie may have been cleared)
  if (profile[0]?.onboardingCompletedAt) redirect('/')

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Vérification de votre compte</h1>
          <p className="mt-2 text-sm text-gray-500">
            Pour accéder à la marketplace, veuillez soumettre votre demande de vérification membre.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <OnboardingForm />
        </div>
      </div>
    </main>
  )
}
