import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

// /sell → dashboard si profil vendeur existant, sinon wizard d'inscription
export default async function SellPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const seller = await db
    .select({ id: sellerProfiles.id })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, user.id))
    .limit(1)
    .then((r) => r.at(0))

  redirect(seller ? '/sell/dashboard' : '/sell/onboarding')
}
