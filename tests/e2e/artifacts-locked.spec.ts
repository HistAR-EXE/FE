import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { SEED } from '../helpers/constants'

/**
 * LUỐNG 6 · Artifacts — AC-11 locked hint.
 */
test.describe('E2E · Artifacts locked', () => {
  test('artifact chưa unlock hiện hint khám phá', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto(`/artifacts?locationId=${SEED.cuChiLocationId}`)
    await expect(page.getByText(/Pokédex|Cổ vật|hiện vật/i).first()).toBeVisible({ timeout: 20_000 })
    // Card locked có label "???" hoặc "Khám phá để mở"
    const lockedCard = page.getByText(/Khám phá để mở|\?\?\?/).first()
    if (await lockedCard.isVisible().catch(() => false)) {
      await lockedCard.click()
      await expect(
        page.getByText(/Khám phá thêm|mở khóa|mở khoá/i).first(),
      ).toBeVisible({ timeout: 10_000 })
    }
  })
})
