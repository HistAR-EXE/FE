import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { SEED } from '../helpers/constants'

/**
 * LUỐNG 3 · Tour 360° — smoke (panorama / map load, không crash).
 */
test.describe('E2E · Tour 360 smoke', () => {
  test('Củ Chi tour 360 load không crash', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto(`/tour/360/${SEED.cuChiLocationId}`)
    await expect(page).toHaveURL(new RegExp(`/tour/360/${SEED.cuChiLocationId}`))
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
    await expect(
      page.locator('main').getByText(/minh hoạ|bản đồ|panorama|360|Củ Chi/i).first(),
    ).toBeVisible({ timeout: 25_000 })
  })
})
