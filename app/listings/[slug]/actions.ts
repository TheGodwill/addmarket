'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { quoteRequests, sellerProfiles, listings, auditLog } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/rate-limit'

const quoteSchema = z.object({
  listingId: z.string().uuid(),
  sellerProfileId: z.string().uuid(),
  message: z
    .string()
    .min(10, 'Minimum 10 caractères')
    .max(1000, 'Maximum 1000 caractères')
    .transform((v) => v.trim()),
})

export async function submitQuoteRequest(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const rl = await checkRateLimit('api', user.id)
  if (!rl.success) return { error: 'Trop de requêtes. Attendez un moment.' }

  const parsed = quoteSchema.safeParse({
    listingId: formData.get('listingId'),
    sellerProfileId: formData.get('sellerProfileId'),
    message: formData.get('message'),
  })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Données invalides' }

  const { listingId, sellerProfileId, message } = parsed.data

  // Verify listing is active and quote-only
  const listing = await db
    .select({ isQuoteOnly: listings.isQuoteOnly })
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.status, 'active')))
    .limit(1)
    .then((r) => r.at(0))

  if (!listing) return { error: 'Listing introuvable' }

  // Prevent self-quote
  const sellerRow = await db
    .select({ userId: sellerProfiles.userId })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.id, sellerProfileId))
    .limit(1)
    .then((r) => r.at(0))

  if (sellerRow?.userId === user.id) return { error: 'Action non autorisée' }

  // Expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const [quote] = await db
    .insert(quoteRequests)
    .values({ listingId, buyerId: user.id, sellerProfileId, message, expiresAt })
    .returning({ id: quoteRequests.id })

  if (!quote) return { error: 'Erreur lors de la soumission' }

  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'quote.request',
    targetType: 'listing',
    targetId: listingId,
    metadata: { quoteId: quote.id, sellerProfileId },
  })

  return { ok: true, quoteId: quote.id }
}
