import { NextRequest, NextResponse } from 'next/server'
import { suggestCities } from '@/lib/geocoding'

// City autocomplete — proxies Mapbox server-side so the secret token is never exposed
export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'public, max-age=60' } })
  }

  const suggestions = await suggestCities(q)
  return NextResponse.json(suggestions, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
