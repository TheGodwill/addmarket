import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { categories } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ListingForm } from '../listing-form'

export const metadata = { title: 'Nouveau listing — ADDMarket' }

export default async function NewListingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Nouveau listing</h1>
        <Link href="/sell/listings" className="text-sm text-blue-600 hover:underline">
          ← Mes listings
        </Link>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <ListingForm categories={cats} />
      </div>
    </div>
  )
}
