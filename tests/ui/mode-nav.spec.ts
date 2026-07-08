import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('UI · Mode navigation', () => {
  test('online mode hides Quét mã in desktop sidebar', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/home')

    await expect(page.getByRole('link', { name: 'Khám phá' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Quét/i })).toHaveCount(0)
  })

  test('offline mode shows Quét mã and hides Khám phá in desktop sidebar', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'offline' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/home')

    await expect(page.getByRole('complementary').getByRole('link', { name: 'Quét thực địa' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Khám phá' })).toHaveCount(0)
  })
})
