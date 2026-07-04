import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('UI · Hộ chiếu Di sản', () => {
  test('Profile hiển thị section Hộ chiếu Di sản sau đăng nhập', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /Hộ chiếu Di sản/i })).toBeVisible({ timeout: 15_000 })
  })
})
