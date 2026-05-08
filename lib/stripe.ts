import 'server-only'
import Stripe from 'stripe'
import { logger } from './logger'

function createStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[stripe] STRIPE_SECRET_KEY est requis en production')
    }
    return null
  }
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

export const stripe = createStripe()

export function getPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null
}

export async function createCheckoutSession(opts: {
  listingId: string
  listingTitle: string
  amountCents: number
  currency: string
  buyerId: string
  sellerProfileId: string
  successUrl: string
  cancelUrl: string
}): Promise<string | null> {
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
      listingId: opts.listingId,
      buyerId: opts.buyerId,
      sellerProfileId: opts.sellerProfileId,
    },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    payment_intent_data: {
      metadata: { listingId: opts.listingId, buyerId: opts.buyerId },
    },
  })

  return session.url
}
