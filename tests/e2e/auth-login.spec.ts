import { test, expect } from '@playwright/test'
import { DEMO_USER } from '../helpers/constants'

/**
 * Tầng 3 · FE+BE — LUỒNG 1: đăng nhập thật qua form → điều hướng mode-select.
 */
test.describe('E2E · Đăng nhập', () => {
  test('login demo qua UI → vào /mode-select', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(DEMO_USER.email)
    await page.locator('input[name="password"]').fill(DEMO_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()

    await expect(page).toHaveURL(/\/mode-select$/, { timeout: 15_000 })
  })

  test('login sai mật khẩu → hiện toast lỗi, ở lại /login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(DEMO_USER.email)
    await page.locator('input[name="password"]').fill('sai-mat-khau-123')
    await page.getByRole('button', { name: 'Tiếp tục' }).click()

    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login$/)
  })
})
