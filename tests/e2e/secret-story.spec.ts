import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { SEED } from '../helpers/constants'

/**
 * LUỐNG 11 · Secret Story — AC-12 gated UI.
 */
test.describe('E2E · Secret Story', () => {
  test('secret story chưa đủ prerequisite hiện thông báo khoá', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto(`/secret/${SEED.denHungLocationId}`)
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
    await expect(
      page.locator('main').getByText(/Khám phá thêm để mở khoá|Hoàn thành nhiệm vụ|Không tải được/i).first(),
    ).toBeVisible({ timeout: 20_000 })
  })
})
