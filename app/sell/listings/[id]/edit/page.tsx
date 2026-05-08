import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { categories } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getListingForEdit } from '../../actions'
import { ListingForm } from '../../listing-form'

export const metadata = { title: 'Modifier le listing — ADDMarket' }

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const result = await getListingForEdit(id, user.id)
  if (!result) notFound()

  const { listing, images } = result

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)

  const initialImages = images.map((img) => ({
    url: img.url,
    altText: img.altText ?? '',
    tempId: img.id,
  }))

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Modifier le listing</h1>
        <Link href="/sell/listings" className="text-sm text-blue-600 hover:underline">
          ← Mes listings
        </Link>
      </div>
      <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
        <span>Dernière modification :</span>
        <span>{listing.updatedAt.toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <ListingForm
          listingId={id}
          initialData={{
            title: listing.title,
            categoryId: listing.categoryId ?? undefined,
            isQuoteOnly: listing.isQuoteOnly,
            priceCents: listing.priceCents,
            description: listing.description,
            tags: listing.tags,
            images: initialImages,
            status: listing.status !== 'removed' ? listing.status : 'draft',
          }}
          categories={cats}
        />
      </div>
    </div>
  )
}
