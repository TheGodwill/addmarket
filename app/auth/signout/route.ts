import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/`, { status: 303 })
}
