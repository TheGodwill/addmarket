import 'server-only'
import { hash, verify } from '@node-rs/argon2'

// argon2id recommandé par OWASP : résiste aux attaques GPU (argon2d) et
// side-channel (argon2i). bcrypt limité à 72 chars et plus vulnérable.
const OPTIONS = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3, // 3 passes
  parallelism: 4,
  outputLen: 32,
}

export async function hashCardNumber(plaintext: string): Promise<string> {
  return hash(plaintext, OPTIONS)
}

export async function verifyCardNumber(plaintext: string, storedHash: string): Promise<boolean> {
  return verify(storedHash, plaintext, OPTIONS)
}
