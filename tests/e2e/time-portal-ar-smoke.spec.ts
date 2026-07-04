import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { SEED } from '../helpers/constants'

/**
 * LUỐNG 13 / FR-06 · AR overlay — smoke route load (sim mode, không cần webcam thật).
 */
test.describe('E2E · Time Portal AR smoke', () => {
  test('AR page Củ Chi load ở chế độ sim', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto(`/time-portal/${SEED.cuChiLocationId}/ar?mode=sim&scene=cua-ham`)
    await expect(page.locator('body')).toBeVisible()
    await expect(
      page.getByText(/AR|Cổng thời gian|Cửa hầm|sim|overlay/i).first(),
    ).toBeVisible({ timeout: 25_000 })
  })
})
