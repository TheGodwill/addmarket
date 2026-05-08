import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { churches } from '@/db/schema'
import { and, eq, ilike, or } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { success } = await checkRateLimit('searchApi', user.id)
  if (!success) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const country = req.nextUrl.searchParams.get('country') ?? 'CI'

  if (q.length < 2) return NextResponse.json([])

  const rows = await db
    .select({ id: churches.id, name: churches.name, city: churches.city, region: churches.region })
    .from(churches)
    .where(
      and(
        eq(churches.country, country),
        eq(churches.isActive, true),
        or(ilike(churches.city, `%${q}%`), ilike(churches.name, `%${q}%`)),
      ),
    )
    .limit(20)

  return NextResponse.json(rows)
}
