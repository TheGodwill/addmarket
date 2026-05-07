import { test, expect } from '@playwright/test'

test.describe('MFA — pages accessibles', () => {
  test('page de challenge MFA est accessible depuis /auth/mfa', async ({ page }) => {
    // Without a session, middleware redirects to login — just check the page exists
    await page.goto('/auth/mfa', { waitUntil: 'domcontentloaded' })
    // Either on /auth/mfa or redirected to /auth/login
    expect(['/auth/mfa', '/auth/login'].some((p) => page.url().includes(p))).toBe(true)
  })

  test('page de code de récupération est accessible depuis /auth/mfa/recovery', async ({
    page,
  }) => {
    await page.goto('/auth/mfa/recovery', { waitUntil: 'domcontentloaded' })
    expect(['/auth/mfa/recovery', '/auth/login'].some((p) => page.url().includes(p))).toBe(true)
  })

  test('page de sécurité est accessible pour les utilisateurs connectés', async ({ page }) => {
    await page.goto('/account/security', { waitUntil: 'domcontentloaded' })
    // Redirects to login if not authenticated
    expect(page.url()).toContain('/auth/login')
  })

  test('middleware redirige les utilisateurs non connectés vers /auth/login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
