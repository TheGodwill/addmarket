import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/db/client'
import { orders, auditLog } from '@/db/schema'
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
      const { listingId, buyerId, sellerProfileId } = session.metadata ?? {}

      if (!buyerId || !sellerProfileId) {
        logger.warn({ sessionId: session.id }, '[stripe-webhook] Metadata manquants')
        return NextResponse.json({ ok: true })
      }

      // Mark order paid
      await db
        .update(orders)
        .set({
          status: 'paid',
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          paidAt: new Date(),
        })
        .where(eq(orders.stripeCheckoutSessionId, session.id))

      await db.insert(auditLog).values({
        actorId: buyerId,
        action: 'order.paid',
        targetType: 'order',
        targetId: session.id,
        metadata: { listingId, sellerProfileId, amountCents: session.amount_total },
      })
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object
      await db
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.stripeCheckoutSessionId, session.id))
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object
      if (typeof charge.payment_intent === 'string') {
        await db
          .update(orders)
          .set({ status: 'refunded' })
          .where(eq(orders.stripePaymentIntentId, charge.payment_intent))
      }
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, '[stripe-webhook] Traitement échoué')
    return NextResponse.json({ error: 'Erreur traitement' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
