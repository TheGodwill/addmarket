import { db } from '@/db/client'
import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET(_req: NextRequest) {
  try {
    await db.execute(sql`SELECT 1`)

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS },
    )
  } catch {
    // Aucun détail d'erreur exposé au client (règle sécurité #12)
    return NextResponse.json({ status: 'error' }, { status: 503, headers: NO_CACHE_HEADERS })
  }
}
