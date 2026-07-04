import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

/**
 * Mode Online vs Offline — MASTER_SPEC §9, ModeGuardRoute.
 */
test.describe('E2E · Mode guard', () => {
  test('online mode: /scan redirect về /explore', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto('/scan')
    await expect(page).toHaveURL(/\/explore/, { timeout: 10_000 })
  })

  test('offline mode: /chat redirect về /scan', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'offline' })
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/scan/, { timeout: 10_000 })
  })

  test('offline mode: /scan render trang check-in', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'offline' })
    await page.goto('/scan')
    await expect(page).toHaveURL(/\/scan$/)
    await expect(page.getByText(/check-in|quét|QR/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
