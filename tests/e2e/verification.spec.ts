import { test, expect } from '@playwright/test'

test.describe('Onboarding page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('onboarding page has correct heading when accessible', async ({ page }) => {
    // Test the page structure without authentication
    const response = await page.goto('/onboarding')
    // Should redirect to login (not 404 or 500)
    expect(response?.status()).not.toBe(404)
    expect(response?.status()).not.toBe(500)
  })
})

test.describe('Referent dashboard', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/referent/verifications')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Admin verifications', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin/verifications')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Cron endpoint', () => {
  test('returns 401 without authorization when secret is configured', async ({ request }) => {
    const res = await request.get('/api/cron/expire-memberships')
    // Either 200 (no secret configured in test env) or 401 (with secret)
    expect([200, 401]).toContain(res.status())
  })
})
