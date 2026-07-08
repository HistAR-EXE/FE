import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

/**
 * Tầng 3 · FE+BE — LUỒNG 2 (Explore & Map).
 */
test.describe('E2E · Explore', () => {
  test('vào /explore (đã đăng nhập) → tải danh sách di tích từ BE', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })

    await page.goto('/explore')
    await expect(page).toHaveURL(/\/explore$/)
    // Di tích seed Củ Chi phải xuất hiện (dữ liệu thật từ BE qua Vite proxy)
    await expect(page.getByText(/Củ Chi/i).first()).toBeVisible({ timeout: 20_000 })
  })

  test('nút "Xem thêm di tích" hoặc danh sách render không lỗi', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })

    await page.goto('/explore')
    // Không có màn hình crash — heading khu vực khám phá hiển thị
    await expect(page.locator('main').first()).toBeVisible({ timeout: 20_000 })
  })
})
