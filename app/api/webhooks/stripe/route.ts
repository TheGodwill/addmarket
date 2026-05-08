import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/db/client'
import { orders, membershipOrders, profiles, auditLog } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Stripe requires the raw body for signature verification — disable body parsing
export const config = { api: { bodyParser: false } }

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })

  const rawBody = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    logger.error({ err }, '[stripe-webhook] Signature invalide')
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const type = session.metadata?.type ?? 'listing_purchase'

      if (type === 'membership_renewal') {
        const { membershipOrderId, userId } = session.metadata ?? {}
        if (!membershipOrderId || !userId) {
          logger.warn({ sessionId: session.id }, '[stripe-webhook] Membership metadata manquants')
          return NextResponse.json({ ok: true })
        }

        const membershipOrder = await db
          .select({ durationDays: membershipOrders.durationDays })
          .from(membershipOrders)
          .where(eq(membershipOrders.id, membershipOrderId))
          .limit(1)
          .then((r) => r.at(0))

        await db
          .update(membershipOrders)
          .set({
            status: 'paid',
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === 'string' ? session.payment_intent : null,
            paidAt: new Date(),
          })
          .where(eq(membershipOrders.id, membershipOrderId))

        const profileRow = await db
          .select({ expiresAt: profiles.expiresAt })
          .from(profiles)
          .where(eq(profiles.id, userId))
          .limit(1)
          .then((r) => r.at(0))

        const now = new Date()
        const base =
          profileRow?.expiresAt && profileRow.expiresAt > now ? profileRow.expiresAt : now
        const durationMs = (membershipOrder?.durationDays ?? 365) * 24 * 60 * 60 * 1000
        const newExpiry = new Date(base.getTime() + durationMs)

        await db
          .update(profiles)
          .set({ expiresAt: newExpiry, membershipStatus: 'verified', updatedAt: new Date() })
          .where(eq(profiles.id, userId))

        await db.insert(auditLog).values({
          actorId: userId,
          action: 'membership.renewed',
          targetType: 'profile',
          targetId: userId,
          metadata: {
            membershipOrderId,
            amountCents: session.amount_total,
            newExpiry: newExpiry.toISOString(),
          },
        })
      } else {
        const { orderId, buyerId, sellerProfileId } = session.metadata ?? {}
        if (!orderId) {
          logger.warn({ sessionId: session.id }, '[stripe-webhook] Order metadata manquants')
          return NextResponse.json({ ok: true })
        }

        await db
          .update(orders)
          .set({
            status: 'paid',
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === 'string' ? session.payment_intent : null,
            paidAt: new Date(),
          })
          .where(eq(orders.id, orderId))

        await db.insert(auditLog).values({
          actorId: buyerId ?? session.id,
          action: 'order.paid',
          targetType: 'order',
          targetId: orderId,
          metadata: { sellerProfileId, amountCents: session.amount_total },
        })
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object
      const type = session.metadata?.type ?? 'listing_purchase'

      if (type === 'membership_renewal') {
        const { membershipOrderId } = session.metadata ?? {}
        if (membershipOrderId) {
          await db
            .update(membershipOrders)
            .set({ status: 'failed' })
            .where(eq(membershipOrders.id, membershipOrderId))
        }
      } else {
        const { orderId } = session.metadata ?? {}
        if (orderId) {
          await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId))
        }
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object
      if (typeof charge.payment_intent === 'string') {
        await db
          .update(orders)
          .set({ status: 'refunded' })
          .where(eq(orders.stripePaymentIntentId, charge.payment_intent))

        await db
          .update(membershipOrders)
          .set({ status: 'refunded' })
          .where(eq(membershipOrders.stripePaymentIntentId, charge.payment_intent))
      }
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, '[stripe-webhook] Traitement échoué')
    return NextResponse.json({ error: 'Erreur traitement' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
