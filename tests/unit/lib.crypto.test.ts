// @vitest-environment node
import { describe, expect, it } from 'vitest'

vi.mock('server-only', () => ({}))

const { hashCardNumber, verifyCardNumber } = await import('@/lib/crypto')

describe('lib/crypto — hashCardNumber / verifyCardNumber', () => {
  it('produit un hash différent du plaintext', async () => {
    const hash = await hashCardNumber('1234567890123456')
    expect(hash).not.toBe('1234567890123456')
    expect(hash).toMatch(/^\$argon2/)
  }, 15000)

  it('deux appels produisent des hashs différents (sel aléatoire)', async () => {
    const h1 = await hashCardNumber('1234567890123456')
    const h2 = await hashCardNumber('1234567890123456')
    expect(h1).not.toBe(h2)
  }, 15000)

  it('verifyCardNumber retourne true pour le bon plaintext', async () => {
    const hash = await hashCardNumber('1234567890123456')
    await expect(verifyCardNumber('1234567890123456', hash)).resolves.toBe(true)
  }, 15000)

  it('verifyCardNumber retourne false pour un mauvais plaintext', async () => {
    const hash = await hashCardNumber('1234567890123456')
    await expect(verifyCardNumber('wrongvalue', hash)).resolves.toBe(false)
  }, 15000)
})
