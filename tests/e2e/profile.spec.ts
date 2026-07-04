import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

/**
 * Tầng 3 · FE+BE — LUỒNG 9 (Profile & Gamification): hiển thị Level + XP.
 */
test.describe('E2E · Profile', () => {
  test('/profile hiển thị Level và XP (hệ 5 cấp)', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })

    await page.goto('/profile')
    await expect(page.getByText(/Level\s*\d/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/XP/).first()).toBeVisible()
  })
})
