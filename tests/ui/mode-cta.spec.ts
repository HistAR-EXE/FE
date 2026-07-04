import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('UI · Mode CTA', () => {
  test('MOD-H3: CTA offline → /scan', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'offline' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/explore')
    await page.getByRole('button', { name: /Bắt đầu hành trình/i }).click()
    await expect(page).toHaveURL(/\/scan/)
  })

  test('MOD-H3: CTA online → /explore', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/profile')
    await page.getByRole('button', { name: /Bắt đầu hành trình/i }).click()
    await expect(page).toHaveURL(/\/explore/)
  })
})
