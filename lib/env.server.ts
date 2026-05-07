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
  // Rate limiting — optionnel en dev, requis en prod
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // Email transactionnel — optionnel en dev
  RESEND_API_KEY: z.string().optional(),
  // Sentry — optionnel (activé si DSN présent)
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  // Chiffrement téléphone (AES-256-GCM) — requis si phone_encrypted est utilisé
  // Générer : openssl rand -hex 32
  PHONE_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  // Secret partagé pour les routes cron
  CRON_SECRET: z.string().optional(),
})

const result = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  PHONE_ENCRYPTION_KEY: process.env.PHONE_ENCRYPTION_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
})

if (!result.success) {
  console.error(
    "[env] Variables d'environnement serveur invalides:",
    result.error.flatten().fieldErrors,
  )
  throw new Error("Variables d'environnement serveur invalides — vérifiez votre .env.local")
}

export const serverEnv = result.data
