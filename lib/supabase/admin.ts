import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { serverEnv } from '@/lib/env.server'
import { clientEnv } from '@/lib/env'

export function createAdminClient() {
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
