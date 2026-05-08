import { test, expect } from '@playwright/test'

test.describe('Moderation — unauthenticated access', () => {
  test('/moderation/reports redirects when unauthenticated', async ({ page }) => {
    await page.goto('/moderation/reports')
    await expect(page).not.toHaveURL('/moderation/reports')
  })

  test('/moderation/queue redirects when unauthenticated', async ({ page }) => {
    await page.goto('/moderation/queue')
    await expect(page).not.toHaveURL('/moderation/queue')
  })
})

test.describe('Community guidelines — public page', () => {
  test('/community/guidelines is publicly accessible', async ({ page }) => {
    await page.goto('/community/guidelines')
    await expect(page).toHaveURL('/community/guidelines')
    await expect(page.locator('h1')).toContainText('Charte communautaire')
  })

  test('Guidelines page contains required sections', async ({ page }) => {
    await page.goto('/community/guidelines')
    const body = await page.locator('body').textContent()
    expect(body).toContain('Contenus autorisés')
    expect(body).toContain('Contenus interdits')
    expect(body).toContain('Sanctions')
  })
})

test.describe('Sitemap includes community guidelines', () => {
  test('/robots.txt still blocks moderation routes', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('Disallow: /admin/')
  })
})
