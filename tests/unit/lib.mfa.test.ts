// @vitest-environment node
import { describe, expect, it } from 'vitest'

vi.mock('server-only', () => ({}))

const { generateRecoveryCodes, hashRecoveryCode, verifyRecoveryCode } = await import('@/lib/mfa')

describe('generateRecoveryCodes', () => {
  it('génère 8 codes par défaut', () => {
    const codes = generateRecoveryCodes()
    expect(codes).toHaveLength(8)
  })

  it('génère N codes si spécifié', () => {
    const codes = generateRecoveryCodes(4)
    expect(codes).toHaveLength(4)
  })

  it('chaque code a le format XXXXX-XXXXX', () => {
    const codes = generateRecoveryCodes()
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/)
    }
  })

  it('les codes sont uniques', () => {
    const codes = generateRecoveryCodes(8)
    const unique = new Set(codes)
    expect(unique.size).toBe(8)
  })

  it('ne contient pas de caractères ambigus (I, O, 0, 1)', () => {
    const codes = generateRecoveryCodes(20)
    const joined = codes.join('')
    expect(joined).not.toMatch(/[IO01]/)
  })
})

describe('hashRecoveryCode / verifyRecoveryCode', () => {
  it('hash et vérifie un code valide', async () => {
    const code = 'ABCDE-FGHJK'
    const hash = await hashRecoveryCode(code)
    expect(hash).toMatch(/^\$argon2/)
    await expect(verifyRecoveryCode(code, hash)).resolves.toBe(true)
  }, 15000)

  it('rejette un code incorrect', async () => {
    const hash = await hashRecoveryCode('ABCDE-FGHJK')
    await expect(verifyRecoveryCode('AAAAA-BBBBB', hash)).resolves.toBe(false)
  }, 15000)

  it('est insensible aux tirets et à la casse', async () => {
    const hash = await hashRecoveryCode('abcde-fghjk')
    // With dash
    await expect(verifyRecoveryCode('ABCDE-FGHJK', hash)).resolves.toBe(true)
    // Without dash
    await expect(verifyRecoveryCode('ABCDEFGHJK', hash)).resolves.toBe(true)
  }, 15000)
})
