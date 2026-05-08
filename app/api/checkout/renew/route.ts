import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles, membershipOrders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createMembershipCheckoutSession } from '@/lib/stripe'
import { checkRateLimit } from '@/lib/rate-limit'
import { clientEnv } from '@/lib/env'
import { headers } from 'next/headers'

const MEMBERSHIP_PRICE_CENTS = parseInt(process.env.MEMBERSHIP_PRICE_CENTS ?? '12000', 10)
const MEMBERSHIP_DURATION_DAYS = parseInt(process.env.MEMBERSHIP_DURATION_DAYS ?? '365', 10)

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown'
  const rl = await checkRateLimit('api', ip)
  if (!rl.success) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  const profileRow = await db
    .select({ membershipStatus: profiles.membershipStatus })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)
    .then((r) => r.at(0))

  if (!profileRow) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const allowed: string[] = ['verified', 'expired']
  if (!allowed.includes(profileRow.membershipStatus)) {
    return NextResponse.json({ error: 'Adhésion non éligible au renouvellement' }, { status: 403 })
  }

  const [order] = await db
    .insert(membershipOrders)
    .values({
      userId: user.id,
      amountCents: MEMBERSHIP_PRICE_CENTS,
      currency: 'eur',
      durationDays: MEMBERSHIP_DURATION_DAYS,
      status: 'pending',
    })
    .returning({ id: membershipOrders.id })

  if (!order) return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 })

  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'
  const result = await createMembershipCheckoutSession({
    membershipOrderId: order.id,
    userId: user.id,
    amountCents: MEMBERSHIP_PRICE_CENTS,
    successUrl: `${baseUrl}/sell/membership?success=1`,
    cancelUrl: `${baseUrl}/sell/membership?cancelled=1`,
  })

  if (!result) {
    return NextResponse.json({ error: 'Paiement non configuré' }, { status: 503 })
  }

  await db
    .update(membershipOrders)
    .set({ stripeCheckoutSessionId: result.sessionId })
    .where(eq(membershipOrders.id, order.id))

  return NextResponse.json({ url: result.url })
}
