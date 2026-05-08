import { test, expect } from '@playwright/test'

test.describe('Seller section — auth protection', () => {
  test('/sell/onboarding redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/sell/onboarding')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/sell/dashboard redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/sell/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/sell/profile/edit redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/sell/profile/edit')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Upload API — auth protection', () => {
  test('POST /api/upload/seller-image returns 401 without auth', async ({ request }) => {
    const form = new FormData()
    form.append('folder', 'logos')
    const res = await request.post('/api/upload/seller-image', {
      multipart: {
        folder: 'logos',
      },
    })
    expect(res.status()).toBe(401)
  })
})
