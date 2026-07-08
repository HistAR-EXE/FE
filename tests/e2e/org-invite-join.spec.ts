import { test, expect } from '@playwright/test'

test.describe('E2E · Org invite join', () => {
  test('ORG-I01: invalid join link shows friendly message', async ({ page }) => {
    await page.goto('/join')
    await expect(page.getByRole('heading', { name: /Link mời không hợp lệ/i })).toBeVisible()
  })

  test('ORG-I01b: join link without login redirects to login', async ({ page }) => {
    await page.goto('/join?code=ABC123')
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toContain('join')
  })
})
