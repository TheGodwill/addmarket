import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles, categories } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { SellerOnboardingWizard } from './wizard'

export const metadata = { title: 'Créer mon profil vendeur — ADDMarket' }

export default async function SellerOnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // If already has a seller profile, redirect to dashboard
  const existing = await db
    .select({ id: sellerProfiles.id })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, user.id))
    .limit(1)

  if (existing.at(0)) redirect('/sell/dashboard')

  const cats = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)

  return <SellerOnboardingWizard categories={cats} />
}
