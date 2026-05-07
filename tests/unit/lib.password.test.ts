// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { validatePassword, isPasswordBreached } = await import('@/lib/password')

describe('validatePassword', () => {
  it('accepte un mot de passe valide', () => {
    const result = validatePassword('Addmarket#2026!')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejette un mot de passe trop court', () => {
    const result = validatePassword('Short#1A')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Au moins 12 caractères')
  })

  it('rejette sans majuscule', () => {
    const result = validatePassword('addmarket#2026!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Au moins une lettre majuscule')
  })

  it('rejette sans minuscule', () => {
    const result = validatePassword('ADDMARKET#2026!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Au moins une lettre minuscule')
  })

  it('rejette sans chiffre', () => {
    const result = validatePassword('Addmarket#motdepasse!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Au moins un chiffre')
  })

  it('rejette sans caractère spécial', () => {
    const result = validatePassword('Addmarket20260101')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Au moins un caractère spécial (!@#$%…)')
  })

  it('renvoie toutes les erreurs en une fois', () => {
    const result = validatePassword('short')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('isPasswordBreached', () => {
  it('retourne false si fetch échoue (fail open)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau indisponible')))
    const result = await isPasswordBreached('quelconque')
    expect(result).toBe(false)
    vi.unstubAllGlobals()
  })

  it('retourne false si la réponse HTTP est non-200 (fail open)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await isPasswordBreached('quelconque')
    expect(result).toBe(false)
    vi.unstubAllGlobals()
  })

  it('retourne true si le suffixe SHA-1 est dans la liste HIBP', async () => {
    // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // prefix = 5BAA6, suffix = 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    const suffix = '1E4C9B93F3F0682250B6CF8331B7EE68FD8'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`${suffix}:12345\nABCDEF1234567890:1\n`),
      }),
    )
    const result = await isPasswordBreached('password')
    expect(result).toBe(true)
    vi.unstubAllGlobals()
  })

  it('retourne false si le suffixe SHA-1 est absent de la liste HIBP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('ABCDEF1234567890:1\n'),
      }),
    )
    const result = await isPasswordBreached('Addmarket#2026!')
    expect(result).toBe(false)
    vi.unstubAllGlobals()
  })
})
