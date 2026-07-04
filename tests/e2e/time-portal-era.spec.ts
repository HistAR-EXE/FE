import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { SEED } from '../helpers/constants'

/**
 * LUỐNG 4 · Time Portal — load scenes và era panel.
 */
test.describe('E2E · Time Portal', () => {
  test('Time Portal Củ Chi load photo scenes', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto(`/time-portal/${SEED.cuChiLocationId}`)
    await expect(page).toHaveURL(new RegExp(`/time-portal/${SEED.cuChiLocationId}`))
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
    // Viewer hoặc era panel trong main (tránh nav title bị truncate hidden)
    await expect(
      page.locator('main').getByText(/1948|1968|2026|So sánh|Thời kỳ|era/i).first(),
    ).toBeVisible({ timeout: 25_000 })
  })
})
