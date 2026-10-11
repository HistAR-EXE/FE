import { expect, test } from '@playwright/test'

test.describe('FE UI · Route code splitting', () => {
  test('shows a route loading state while the pricing route chunk is pending', async ({ page }) => {
    await page.route('**/src/pages/PricingPage.tsx', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      await route.continue()
    })

    await page.goto('/pricing')

    await expect(page.getByTestId('route-loading')).toBeVisible()
    await expect(page.getByTestId('route-loading')).toBeHidden()
    await expect(page.getByRole('heading', { name: /Đầu tư vào thế hệ/i })).toBeVisible()
  })
})
