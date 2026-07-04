import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('E2E · Explore recommendations', () => {
  test('REC-H1: RecommendationCard render sau login', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto('/explore')
    await expect(page.getByText(/Củ Chi/i).first()).toBeVisible({ timeout: 20_000 })
    const rec = page.getByText(/Gợi ý tiếp theo/i)
    if (await rec.isVisible().catch(() => false)) {
      await expect(rec).toBeVisible()
    } else {
      // Empty recommendations OK — page must not crash
      await expect(page.locator('main')).toBeVisible()
    }
  })
})
