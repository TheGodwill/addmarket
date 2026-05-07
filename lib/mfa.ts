import 'server-only'
import { randomBytes } from 'crypto'
import { hash, verify } from '@node-rs/argon2'

const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
}

// Alphabet without ambiguous chars (I, O, 0, 1)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(10)
    let code = ''
    for (const byte of bytes) {
      code += ALPHABET[byte % ALPHABET.length]
    }
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`)
  }
  return codes
}

function normalise(code: string): string {
  return code.replace(/-/g, '').toUpperCase()
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return hash(normalise(code), ARGON2_OPTIONS)
}

export async function verifyRecoveryCode(code: string, storedHash: string): Promise<boolean> {
  return verify(storedHash, normalise(code), ARGON2_OPTIONS)
}
