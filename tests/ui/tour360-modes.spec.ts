import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { DEMO_USER, SEED } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('UI · Tour360 view mode toggles', () => {
  test('T360-B1: Sơ Đồ / Vệ tinh / 360° toggle buttons exist and switch', async ({ page, request }) => {
    const user = await login(request, DEMO_USER)
    await seedSession(page, user, { mode: 'online' })

    await page.goto(`/tour/360/${SEED.cuChiLocationId}`)
    await expect(page.getByRole('button', { name: 'Sơ Đồ Bản Vẽ' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Bản Đồ Vệ Tinh' })).toBeVisible()

    await page.getByRole('button', { name: 'Bản Đồ Vệ Tinh' }).click()
    await expect(page.locator('.tour360-leaflet-map').first()).toBeVisible()

    await page.getByRole('button', { name: 'Sơ Đồ Bản Vẽ' }).click()
    await expect(page.locator('.tour360-viewport').first()).toBeVisible()

    const enter360 = page.getByRole('button', { name: 'Vào Khung Gian 360°' })
    if (await enter360.isVisible().catch(() => false)) {
      await enter360.click()
      await expect(page.locator('.tour360-viewport').first()).toBeVisible()
    }
  })
})
