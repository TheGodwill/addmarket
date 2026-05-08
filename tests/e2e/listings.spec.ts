import { test, expect } from '@playwright/test'

test.describe('Listings — auth protection', () => {
  test('/sell/listings redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/sell/listings')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/sell/listings/new redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/sell/listings/new')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/sell/listings/fake-id/edit redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/sell/listings/00000000-0000-0000-0000-000000000000/edit')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/sell/listings/fake-id/stats redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/sell/listings/00000000-0000-0000-0000-000000000000/stats')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Listing image upload — auth protection', () => {
  test('POST /api/upload/listing-image returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/upload/listing-image', {
      multipart: { file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') } },
    })
    expect(res.status()).toBe(401)
  })
})
