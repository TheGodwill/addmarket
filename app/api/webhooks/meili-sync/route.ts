import { NextRequest, NextResponse } from 'next/server'
import { syncListing, deleteListing, syncSeller, deleteSeller } from '@/lib/search-sync'
import { logger } from '@/lib/logger'

/**
 * Supabase Database Webhook → real-time Meilisearch sync.
 *
 * Setup in Supabase dashboard → Database → Webhooks:
 *   Table: listings       → events: INSERT, UPDATE, DELETE
 *   Table: seller_profiles → events: INSERT, UPDATE, DELETE
 *   URL: https://<your-domain>/api/webhooks/meili-sync
 *   HTTP headers: x-webhook-secret: <MEILISEARCH_WEBHOOK_SECRET>
 *
 * Payload shape (Supabase DB webhook):
 *   { type: 'INSERT'|'UPDATE'|'DELETE', table: string, record: {...}|null, old_record: {...}|null }
 */

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: { id: string } | null
  old_record: { id: string } | null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify webhook secret
  const secret = process.env.MEILISEARCH_WEBHOOK_SECRET
  if (secret) {
    const provided = req.headers.get('x-webhook-secret')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: WebhookPayload
  try {
    body = (await req.json()) as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, table, record, old_record } = body
  const id = record?.id ?? old_record?.id
  if (!id) return NextResponse.json({ ok: true })

  try {
    if (table === 'listings') {
      if (type === 'DELETE') {
        await deleteListing(id)
      } else {
        await syncListing(id)
      }
    } else if (table === 'seller_profiles') {
      if (type === 'DELETE') {
        await deleteSeller(id)
      } else {
        await syncSeller(id)
      }
    }
  } catch (err) {
    logger.error({ err, table, id, type }, '[meili-sync] webhook error')
    // Return 200 to avoid Supabase retrying (already logged)
  }

  return NextResponse.json({ ok: true })
}
