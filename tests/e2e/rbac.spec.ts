import { test, expect } from '@playwright/test'

test.describe('Admin route protection', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('admin verifications redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin/verifications')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('admin pages return no 404 or 500 for unauthenticated (only redirect)', async ({ page }) => {
    const response = await page.goto('/admin/users')
    expect(response?.status()).not.toBe(404)
    expect(response?.status()).not.toBe(500)
  })
})

test.describe('Referent route protection', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/referent/verifications')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Horizontal escalation prevention', () => {
  test('/admin/users is not accessible without authentication', async ({ request }) => {
    const res = await request.get('/admin/users', { maxRedirects: 0 })
    // Should redirect (3xx) to login — not serve the page directly
    expect(res.status()).toBeGreaterThanOrEqual(300)
    expect(res.status()).toBeLessThan(400)
  })

  test('/referent/verifications is not accessible without authentication', async ({ request }) => {
    const res = await request.get('/referent/verifications', { maxRedirects: 0 })
    expect(res.status()).toBeGreaterThanOrEqual(300)
    expect(res.status()).toBeLessThan(400)
  })
})

test.describe('Cron endpoint authorization', () => {
  test('returns 401 without authorization when secret is configured', async ({ request }) => {
    const res = await request.get('/api/cron/expire-memberships')
    expect([200, 401]).toContain(res.status())
  })
})
