import 'server-only'
import { randomInt } from 'crypto'
import { Redis } from '@upstash/redis'
import { logger } from './logger'

const OTP_TTL = 600 // 10 minutes
const KEY = (userId: string) => `mfa:otp:${userId}`

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

// In-memory fallback for dev without Upstash Redis
const devStore = new Map<string, { code: string; expires: number }>()

export function generateOtp(): string {
  return randomInt(0, 999999).toString().padStart(6, '0')
}

export async function storeOtp(userId: string, code: string): Promise<void> {
  const redis = createRedis()
  if (redis) {
    await redis.setex(KEY(userId), OTP_TTL, code)
  } else {
    devStore.set(userId, { code, expires: Date.now() + OTP_TTL * 1000 })
    logger.warn({ userId }, `[dev/otp] Code OTP : ${code}`)
  }
}

export async function verifyAndConsumeOtp(userId: string, code: string): Promise<boolean> {
  const redis = createRedis()
  if (redis) {
    const stored = await redis.get<string>(KEY(userId))
    if (!stored || stored !== code) return false
    await redis.del(KEY(userId))
    return true
  }
  // Dev fallback
  const entry = devStore.get(userId)
  if (!entry || Date.now() > entry.expires) {
    devStore.delete(userId)
    return false
  }
  if (entry.code !== code) return false
  devStore.delete(userId)
  return true
}

export async function invalidateOtp(userId: string): Promise<void> {
  const redis = createRedis()
  if (redis) {
    await redis.del(KEY(userId))
  } else {
    devStore.delete(userId)
  }
}
