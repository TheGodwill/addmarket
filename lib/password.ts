import 'server-only'

export interface PasswordValidation {
  valid: boolean
  errors: string[]
}

const SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  if (password.length < 12) errors.push('Au moins 12 caractères')
  if (!/[A-Z]/.test(password)) errors.push('Au moins une lettre majuscule')
  if (!/[a-z]/.test(password)) errors.push('Au moins une lettre minuscule')
  if (!/[0-9]/.test(password)) errors.push('Au moins un chiffre')
  if (!SPECIAL.test(password)) errors.push('Au moins un caractère spécial (!@#$%…)')
  return { valid: errors.length === 0, errors }
}

// k-anonymity : seuls les 5 premiers caractères du hash SHA-1 sont envoyés
export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const encoded = new TextEncoder().encode(password)
    const buffer = await globalThis.crypto.subtle.digest('SHA-1', encoded)
    const hex = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    const prefix = hex.slice(0, 5)
    const suffix = hex.slice(5)

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      // Ne jamais mettre en cache — les listes de compromission évoluent
      cache: 'no-store',
    })
    if (!res.ok) return false // En cas d'erreur réseau, on ne bloque pas

    const text = await res.text()
    return text.split('\n').some((line) => line.toUpperCase().startsWith(suffix))
  } catch {
    return false // Fail open : HIBP est optionnel
  }
}
