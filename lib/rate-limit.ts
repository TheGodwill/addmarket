import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[rate-limit] UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont requis en production',
      )
    }
    return null
  }
  return new Redis({ url, token })
}

const redis = createRedis()

type Duration = `${number} ms` | `${number} s` | `${number} m` | `${number} h` | `${number} d`

function createLimiter(requests: number, window: Duration): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  })
}

// Limites par défaut :
// auth    → 5 req/min/IP  (login, forgot-password)
// signup  → 3 req/h/IP    (inscription)
// api     → 60 req/min/user (endpoints standards)
export const rateLimiters = {
  auth: createLimiter(5, '1 m'),
  signup: createLimiter(3, '1 h'),
  api: createLimiter(60, '1 m'),
} as const

export type LimiterName = keyof typeof rateLimiters

export async function checkRateLimit(
  limiter: LimiterName,
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const instance = rateLimiters[limiter]

  // Upstash non configuré → rate limiting désactivé (dev sans Redis)
  if (!instance) {
    return { success: true, remaining: 999, reset: 0 }
  }

  const result = await instance.limit(identifier)
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}
