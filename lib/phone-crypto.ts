/**
 * Chiffrement AES-256-GCM des numéros de téléphone.
 *
 * Choix applicatif vs pgsodium :
 *  - Pas de dépendance à l'extension pgsodium (non disponible sur tous les plans Supabase)
 *  - Gestion de la clé dans l'app (rotation sans migration SQL)
 *  - Séparation claire : la DB stocke un blob opaque, l'app détient la clé
 *
 * Format du ciphertext stocké : hex(iv):hex(authTag):hex(ciphertext)
 * IV : 12 octets aléatoires par chiffrement (GCM recommandation NIST)
 */
import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32

function getKey(): Buffer {
  const hex = process.env.PHONE_ENCRYPTION_KEY
  if (!hex) throw new Error('[phone-crypto] PHONE_ENCRYPTION_KEY est requis')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== KEY_BYTES) {
    throw new Error('[phone-crypto] PHONE_ENCRYPTION_KEY doit être 64 caractères hex (32 octets)')
  }
  return key
}

export function encryptPhone(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptPhone(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('[phone-crypto] Format de ciphertext invalide')
  const [ivHex, tagHex, encHex] = parts as [string, string, string]
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8')
}
