'use client'

import { createBrowserClient } from '@supabase/ssr'
import { clientEnv } from '@/lib/env'

// Client Supabase pour les Client Components (realtime, auth côté client).
// Singleton : réutilise la même instance si appelé plusieurs fois.
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
