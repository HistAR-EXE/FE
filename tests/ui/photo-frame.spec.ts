import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('UI · Photo Frame (AC-9)', () => {
  test('VIR-B2: fallback copy Chọn từ thư viện ảnh', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'offline' })
    await page.goto('/photo-frame')
    await expect(page.getByText(/Chọn từ thư viện ảnh/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input[type="file"]')).toBeVisible()
  })
})
