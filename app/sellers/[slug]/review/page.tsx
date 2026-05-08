import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db/client'
import { sellerProfiles, profiles } from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import { getExistingReview } from './actions'
import { ReviewForm } from './review-form'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Laisser un avis — ADDMarket` }
}

export default async function LeaveReviewPage({ params }: Props) {
  const { slug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/sellers/${slug}/review`)

  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'review.create')) redirect(`/sellers/${slug}`)

  // Check verified membership
  const profileRows = await db
    .select({ membershipStatus: profiles.membershipStatus, displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)
  const profile = profileRows.at(0)
  if (profile?.membershipStatus !== 'verified') {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Réservé aux membres vérifiés</h1>
        <p className="mt-2 text-sm text-gray-500">
          Seuls les membres dont l&apos;adhésion a été validée peuvent laisser des avis.
        </p>
      </main>
    )
  }

  const sellerRows = await db
    .select({
      id: sellerProfiles.id,
      businessName: sellerProfiles.businessName,
      userId: sellerProfiles.userId,
    })
    .from(sellerProfiles)
    .where(and(eq(sellerProfiles.slug, slug), eq(sellerProfiles.isActive, true)))
    .limit(1)
  const seller = sellerRows.at(0)
  if (!seller) notFound()

  // Cannot review yourself
  if (seller.userId === user.id) redirect(`/sellers/${slug}`)

  const existing = await getExistingReview(seller.id)

  // Check 30-day cooldown
  let cooldownUntil: Date | null = null
  if (existing) {
    const end = new Date(existing.updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    if (new Date() < end) cooldownUntil = end
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-1 text-xl font-bold text-gray-900">
        {existing ? 'Modifier votre avis' : 'Laisser un avis'}
      </h1>
      <p className="mb-6 text-sm text-gray-500">{seller.businessName}</p>

      {cooldownUntil ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Vous pourrez modifier votre avis à partir du{' '}
          <strong>{cooldownUntil.toLocaleDateString('fr-FR')}</strong>.
        </div>
      ) : (
        <ReviewForm
          sellerId={seller.id}
          sellerSlug={slug}
          existing={existing ? { rating: existing.rating, comment: existing.comment ?? '' } : null}
        />
      )}
    </main>
  )
}
