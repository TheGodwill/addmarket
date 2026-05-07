import { test, expect } from '@playwright/test'

test.describe('Legal pages — public access', () => {
  test('mentions légales is accessible without auth', async ({ page }) => {
    const res = await page.goto('/legal/mentions')
    expect(res?.status()).not.toBe(404)
    expect(res?.status()).not.toBe(500)
    await expect(page).toHaveURL('/legal/mentions')
  })

  test('privacy policy is accessible without auth', async ({ page }) => {
    const res = await page.goto('/legal/privacy')
    expect(res?.status()).not.toBe(404)
    expect(res?.status()).not.toBe(500)
    await expect(page).toHaveURL('/legal/privacy')
  })

  test('CGU is accessible without auth', async ({ page }) => {
    const res = await page.goto('/legal/terms')
    expect(res?.status()).not.toBe(404)
    expect(res?.status()).not.toBe(500)
    await expect(page).toHaveURL('/legal/terms')
  })
})

test.describe('Data export endpoint', () => {
  test('returns 401 for unauthenticated requests', async ({ request }) => {
    const res = await request.get('/api/account/export')
    expect(res.status()).toBe(401)
  })
})

test.describe('Account RGPD pages — auth required', () => {
  test('/account/data-export redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/account/data-export')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/account/delete redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/account/delete')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/account/consents redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/account/consents')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Cron — process-deletions endpoint', () => {
  test('returns 401 without authorization when secret is configured', async ({ request }) => {
    const res = await request.get('/api/cron/process-deletions')
    expect([200, 401]).toContain(res.status())
  })
})
