import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { listings, sellerProfiles, orders, auditLog } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { createCheckoutSession } from '@/lib/stripe'
import { checkRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { clientEnv } from '@/lib/env'

const bodySchema = z.object({
  listingId: z.string().uuid(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for') ?? 'unknown'
  const rl = await checkRateLimit('api', ip)
  if (!rl.success) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const { listingId } = parsed.data

  // Load listing
  const listing = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.status, 'active')))
    .limit(1)
    .then((r) => r.at(0))

  if (!listing) return NextResponse.json({ error: 'Listing introuvable' }, { status: 404 })
  if (listing.isQuoteOnly || listing.priceCents == null) {
    return NextResponse.json(
      { error: 'Ce listing ne supporte pas le paiement direct' },
      { status: 400 },
    )
  }

  // Prevent buying own listing
  const sellerRow = await db
    .select({ userId: sellerProfiles.userId })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.id, listing.sellerId))
    .limit(1)
    .then((r) => r.at(0))

  if (sellerRow?.userId === user.id) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas acheter votre propre listing' },
      { status: 400 },
    )
  }

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'

  // Create pending order record
  const [order] = await db
    .insert(orders)
    .values({
      listingId,
      buyerId: user.id,
      sellerProfileId: listing.sellerId,
      amountCents: listing.priceCents,
      currency: listing.currency.toLowerCase(),
      status: 'pending',
    })
    .returning({ id: orders.id })

  if (!order) return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 })

  const checkoutUrl = await createCheckoutSession({
    listingId,
    listingTitle: listing.title,
    amountCents: listing.priceCents,
    currency: listing.currency.toLowerCase(),
    buyerId: user.id,
    sellerProfileId: listing.sellerId,
    successUrl: `${baseUrl}/orders/${order.id}?success=1`,
    cancelUrl: `${baseUrl}/listings/${listingId}?cancelled=1`,
  })

  if (!checkoutUrl) {
    return NextResponse.json({ error: 'Paiement non configuré' }, { status: 503 })
  }

  // Store session reference (updated by webhook once confirmed)
  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'order.create',
    targetType: 'order',
    targetId: order.id,
    metadata: { listingId, amountCents: listing.priceCents },
  })

  return NextResponse.json({ url: checkoutUrl })
}
