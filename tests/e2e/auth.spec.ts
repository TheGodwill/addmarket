import { test, expect } from '@playwright/test'

test.describe("Flux d'authentification", () => {
  test('page de connexion est accessible', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByText('Connexion')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Mot de passe')).toBeVisible()
  })

  test("page d'inscription est accessible", async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByText('Créer un compte')).toBeVisible()
    await expect(page.getByLabel('Nom affiché')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  test("lien S'inscrire depuis la page de connexion", async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: "S'inscrire" }).click()
    await expect(page).toHaveURL('/auth/signup')
  })

  test("lien Se connecter depuis la page d'inscription", async ({ page }) => {
    await page.goto('/auth/signup')
    await page.getByRole('link', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL('/auth/login')
  })

  test('lien Mot de passe oublié depuis la page de connexion', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click()
    await expect(page).toHaveURL('/auth/forgot-password')
  })

  test('page de verification email est accessible', async ({ page }) => {
    await page.goto('/auth/verify-email')
    await expect(page.getByText('Vérifiez votre email')).toBeVisible()
  })

  test('inscription — erreur si les mots de passe ne correspondent pas', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.getByLabel('Nom affiché').fill('Test User')
    await page.getByLabel('Email').fill('test@exemple.fr')
    await page.getByLabel('Mot de passe').fill('Addmarket#2026!')
    await page.getByLabel('Confirmer le mot de passe').fill('DifferentPass#1!')
    await page.getByRole('button', { name: "S'inscrire" }).click()
    await expect(page.getByRole('alert')).toContainText('correspondent pas')
  })

  test('connexion — erreur pour des credentials invalides', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('inexistant@exemple.fr')
    await page.getByLabel('Mot de passe').fill('WrongPassword#1!')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByRole('alert')).toContainText('incorrect')
  })

  test('force du mot de passe — affichee lors de la saisie', async ({ page }) => {
    await page.goto('/auth/signup')
    const pwField = page.getByLabel('Mot de passe')
    await pwField.fill('abc')
    await expect(page.getByText('Force')).toBeVisible()
  })
})
