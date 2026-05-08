import 'server-only'
import Stripe from 'stripe'
import { logger } from './logger'

function createStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    logger.warn('[stripe] STRIPE_SECRET_KEY absent — paiements désactivés')
    return null
  }
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

export const stripe = createStripe()

export function getPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null
}

export async function createCheckoutSession(opts: {
  orderId: string
  listingTitle: string
  amountCents: number
  currency: string
  buyerId: string
  sellerProfileId: string
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string; sessionId: string } | null> {
  if (!stripe) {
    logger.warn('[stripe] Stripe non configuré — checkout désactivé')
    return null
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: opts.currency,
          unit_amount: opts.amountCents,
          product_data: { name: opts.listingTitle },
        },
      },
    ],
    metadata: {
      type: 'listing_purchase',
      orderId: opts.orderId,
      buyerId: opts.buyerId,
      sellerProfileId: opts.sellerProfileId,
    },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    payment_intent_data: {
      metadata: { orderId: opts.orderId, buyerId: opts.buyerId },
    },
  })

  if (!session.url) return null
  return { url: session.url, sessionId: session.id }
}

export async function createMembershipCheckoutSession(opts: {
  membershipOrderId: string
  userId: string
  amountCents: number
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string; sessionId: string } | null> {
  if (!stripe) {
    logger.warn('[stripe] Stripe non configuré — membership checkout désactivé')
    return null
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: opts.amountCents,
          product_data: { name: 'Adhésion ADDMarket — 1 an' },
        },
      },
    ],
    metadata: {
      type: 'membership_renewal',
      membershipOrderId: opts.membershipOrderId,
      userId: opts.userId,
    },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  })

  if (!session.url) return null
  return { url: session.url, sessionId: session.id }
}
