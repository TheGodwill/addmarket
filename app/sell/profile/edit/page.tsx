import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles, categories } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { EditProfileForm } from './edit-form'

export const metadata = { title: 'Modifier mon profil vendeur — ADDMarket' }

export default async function EditProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sellerRows = await db
    .select()
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, user.id))
    .limit(1)

  const seller = sellerRows.at(0)
  if (!seller) redirect('/sell/onboarding')

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Modifier mon profil</h1>
        <a href="/sell/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Tableau de bord
        </a>
      </div>
      <EditProfileForm seller={seller} categories={cats} />
    </div>
  )
}
