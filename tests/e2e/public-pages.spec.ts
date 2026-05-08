import { test, expect } from '@playwright/test'

test.describe('Public pages — accessibility (unauthenticated)', () => {
  test('/sellers/unknown-slug returns 404', async ({ page }) => {
    await page.goto('/sellers/this-seller-does-not-exist-xyz')
    expect(page.url()).toContain('/sellers/')
    // 404 page renders without redirect to login
    await expect(page.locator('body')).not.toContainText('Connectez-vous')
  })

  test('/listings/invalid-id returns 404', async ({ page }) => {
    await page.goto('/listings/00000000-0000-0000-0000-000000000000')
    expect(page.url()).toContain('/listings/')
  })
})

test.describe('Sitemap + robots', () => {
  test('/sitemap.xml is accessible', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('<urlset')
  })

  test('/robots.txt is accessible and blocks /admin', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('Disallow: /admin/')
    expect(body).toContain('Sitemap:')
  })
})
