import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function SellLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profileRows = await db
    .select({ membershipStatus: profiles.membershipStatus })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  const profile = profileRows.at(0)
  if (!profile || profile.membershipStatus !== 'verified') {
    redirect('/?error=verification_required')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-blue-600">
            ← ADDMarket
          </Link>
          <span className="text-sm text-gray-500">Espace vendeur</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  )
}
