import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

/**
 * Tầng 2 · FE UI — routing, guard, error handling (LUỒNG 1, ERROR HANDLING).
 * Các test này chủ yếu kiểm tra hành vi FE, ít phụ thuộc dữ liệu BE.
 */
test.describe('FE UI · Routing & Guards', () => {
  test('Splash / render logo TimeLens + nút Bắt đầu', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('TimeLens', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Đăng ký trải nghiệm/i })).toBeVisible()
  })

  test('ERROR: route không tồn tại → trang 404 custom', async ({ page }) => {
    await page.goto('/khong-ton-tai-abc-xyz')
    await expect(page.getByText('404', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Về trang khám phá' })).toBeVisible()
  })

  test('LUỒNG 1: truy cập route bảo vệ khi chưa đăng nhập → chuyển /login?returnTo=', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login\?returnTo=/)
    await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible()
  })

  test('/login render form email + mật khẩu', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('/login chuyển tab Đăng ký hiện field Tên hiển thị (BR-01)', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Đăng Ký Mới', exact: true }).click()
    await expect(page.locator('input[name="displayName"]')).toBeVisible()
  })

  test('mode-select render sau login seed', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/mode-select')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
  })

  test('HER-B1: invalid heritage UUID vẫn render trang (không crash)', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto('/explore/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
  })
})
