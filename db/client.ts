import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { serverEnv } from '@/lib/env.server'
import * as schema from './schema'

// Une seule instance partagée (module singleton)
const queryClient = postgres(serverEnv.DATABASE_URL, {
  // Désactivé pour compatibilité avec Supabase Pooler (transaction mode)
  prepare: false,
})

export const db = drizzle(queryClient, { schema })
