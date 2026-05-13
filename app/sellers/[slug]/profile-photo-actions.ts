'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { sellerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function updateSellerPhoto(
  sellerSlug: string,
  field: 'logoUrl' | 'coverUrl',
  url: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const updated = await db
    .update(sellerProfiles)
    .set({ [field]: url, updatedAt: new Date() })
    .where(eq(sellerProfiles.userId, user.id))
    .returning({ id: sellerProfiles.id })

  if (!updated.at(0)) throw new Error('Profil introuvable ou non autorisé')

  revalidatePath(`/sellers/${sellerSlug}`)
  revalidatePath('/sell/dashboard')
}
