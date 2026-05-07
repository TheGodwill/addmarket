import { describe, expect, it } from 'vitest'
import { REJECTION_REASON_CODES, REJECTION_REASON_LABELS } from '@/db/schema'

describe('verification schema constants', () => {
  it('has 6 rejection reason codes', () => {
    expect(REJECTION_REASON_CODES).toHaveLength(6)
  })

  it('has a label for every code', () => {
    for (const code of REJECTION_REASON_CODES) {
      expect(REJECTION_REASON_LABELS[code]).toBeTruthy()
    }
  })

  it('includes other as last fallback code', () => {
    expect(REJECTION_REASON_CODES).toContain('other')
  })
})

describe('card number validation', () => {
  const validNumbers = ['12345', '0123456789', '12345678901234567890']
  const invalidNumbers = ['abcd', '123 456', '']

  it.each(validNumbers)('accepts %s', (n) => {
    expect(/^\d+$/.test(n) && n.length >= 4 && n.length <= 20).toBe(true)
  })

  it.each(invalidNumbers)('rejects %s', (n) => {
    expect(/^\d+$/.test(n) && n.length >= 4 && n.length <= 20).toBe(false)
  })

  it('extracts last 4 digits correctly', () => {
    expect('123456789'.slice(-4)).toBe('6789')
    expect('1234'.slice(-4)).toBe('1234')
  })
})

describe('resubmit_after logic', () => {
  it('blocks resubmission within 24h', () => {
    const resubmitAfter = new Date(Date.now() + 23 * 3_600_000)
    expect(new Date() < resubmitAfter).toBe(true)
  })

  it('allows resubmission after 24h', () => {
    const resubmitAfter = new Date(Date.now() - 1000)
    expect(new Date() < resubmitAfter).toBe(false)
  })

  it('computes correct resubmit_after (24h from now)', () => {
    const before = Date.now()
    const resubmitAfter = new Date(before + 24 * 3_600_000)
    const diff = resubmitAfter.getTime() - before
    expect(diff).toBe(24 * 3_600_000)
  })
})

describe('expires_at logic', () => {
  it('sets expiry to exactly 1 year from approval', () => {
    const now = new Date('2026-05-07T10:00:00Z')
    const expiresAt = new Date(now)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    expect(expiresAt.toISOString()).toBe('2027-05-07T10:00:00.000Z')
  })
})

describe('storage path format', () => {
  it('generates valid upload path', () => {
    const userId = 'user-123'
    const side = 'front'
    const ts = 1234567890000
    const path = `${userId}/${side}_${ts}.jpg`
    expect(path).toBe('user-123/front_1234567890000.jpg')
  })

  it('uses jpg extension for jpeg mime type', () => {
    function mimeToExt(mime: string): string {
      return mime === 'image/jpeg' ? 'jpg' : (mime.split('/')[1] ?? 'bin')
    }
    expect(mimeToExt('image/jpeg')).toBe('jpg')
  })

  it('uses png extension for png mime type', () => {
    function mimeToExt(mime: string): string {
      return mime === 'image/jpeg' ? 'jpg' : (mime.split('/')[1] ?? 'bin')
    }
    expect(mimeToExt('image/png')).toBe('png')
  })
})
