import { test, expect } from '@playwright/test'
import { login } from '../../helpers/api'
import { DEMO_USER, SEED } from '../../helpers/constants'
import { seedSession } from '../../helpers/session'

test.describe('UI · Resilience slow network loading (FE-NAV-02)', () => {
  test('FE-NAV-02a: Tour360 shows .tour360-loading then content', async ({ page, request }) => {
    const user = await login(request, DEMO_USER)
    await seedSession(page, user, { mode: 'online' })

    await page.route('**/api/panoramas/**', async (route) => {
      await new Promise((r) => setTimeout(r, 2000))
      await route.continue()
    })

    await page.goto(`/tour/360/${SEED.cuChiLocationId}`)
    await expect(page.locator('.tour360-loading').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.tour360-loading').first()).toBeHidden({ timeout: 30_000 })
  })

  test('FE-NAV-02b: Time Portal shows Đang tải ảnh lịch sử then content', async ({ page, request }) => {
    const user = await login(request, DEMO_USER)
    await seedSession(page, user, { mode: 'online' })

    await page.route('**/api/photo-scenes/**', async (route) => {
      await new Promise((r) => setTimeout(r, 2000))
      await route.continue()
    })

    await page.goto(`/time-portal/${SEED.cuChiLocationId}`)
    await expect(page.getByText('Đang tải ảnh lịch sử...')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Đang tải ảnh lịch sử...')).toBeHidden({ timeout: 30_000 })
  })
})
