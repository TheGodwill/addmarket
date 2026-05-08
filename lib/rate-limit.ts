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
// auth           → 5 req/min/IP    (login, forgot-password)
// signup         → 3 req/h/IP      (inscription)
// mfa            → 5 req/15min/IP  (OTP email — verrouillage strict)
// recovery       → 5 req/15min/IP  (codes de récupération — idem)
// api            → 60 req/min/user (endpoints standards)
// referentAction → 50 req/h/user   (approbations/rejets — anti-bot)
// adminAction    → 10 req/h/user   (promotion/révocation — anti-mass-action)
export const rateLimiters = {
  auth: createLimiter(5, '1 m'),
  signup: createLimiter(3, '1 h'),
  mfa: createLimiter(5, '15 m'),
  recovery: createLimiter(5, '15 m'),
  api: createLimiter(60, '1 m'),
  referentAction: createLimiter(50, '1 h'),
  adminAction: createLimiter(10, '1 h'),
  listingCreate: createLimiter(20, '1 h'),
  listingUpdate: createLimiter(100, '1 h'),
  reviewCreate: createLimiter(5, '1 d'),
  profileUpdate: createLimiter(20, '1 h'),
  searchApi: createLimiter(60, '1 m'),
  messageSend: createLimiter(30, '1 m'),
  verificationSubmit: createLimiter(3, '1 d'),
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
