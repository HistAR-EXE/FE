import { test, expect } from '@playwright/test'

test.describe('UI · Google login button', () => {
  test('AUTH-G07: login page shows Google button when Firebase env configured', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Tiếp tục với Google ID/i })).toBeVisible({
      timeout: 15_000,
    })
  })
})
