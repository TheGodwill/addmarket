import 'server-only'
import { z } from 'zod'

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string()
    .regex(
      /^(postgresql|postgres):\/\/.+/,
      'DATABASE_URL doit être une URL PostgreSQL valide (postgresql://)',
    ),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY est requis'),
})

const result = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
})

if (!result.success) {
  console.error(
    "[env] Variables d'environnement serveur invalides:",
    result.error.flatten().fieldErrors,
  )
  throw new Error("Variables d'environnement serveur invalides — vérifiez votre .env.local")
}

export const serverEnv = result.data
