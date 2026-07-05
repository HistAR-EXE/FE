import { test, expect } from '@playwright/test'
import { ADMIN_USER, SEED } from '../helpers/constants'
import { registerFreshUser } from '../helpers/api'

/**
 * E2E-AUTH-1 / E2E-CMS-1 — Admin login → CMS → tạo hiện vật.
 */
test.describe('E2E · Admin CMS', () => {
  test('admin login → /admin/content → tab Hiện vật → Thêm hiện vật', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(ADMIN_USER.email)
    await page.locator('input[name="password"]').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()

    await expect(page).toHaveURL(/\/admin\/content$/, { timeout: 15_000 })

    await page.getByRole('button', { name: /Hiện vật/i }).click()
    await page.getByRole('button', { name: 'Thêm hiện vật' }).click()

    const unique = `e2e-artifact-${Date.now()}`
    await page.getByLabel('Tên *').fill(`Hiện vật E2E ${unique}`)
    await page.getByLabel('unlock_key *').fill(`artifact:e2e-${unique}`)
    await page.getByRole('button', { name: 'Lưu' }).click()

    await expect(page.getByText(`Hiện vật E2E ${unique}`)).toBeVisible({ timeout: 10_000 })
  })

  test('USER không vào được /admin/content', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(user.email)
    await page.locator('input[name="password"]').fill(user.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(page).toHaveURL(/\/mode-select$/, { timeout: 15_000 })

    await page.goto('/admin/content')
    await expect(page).not.toHaveURL(/\/admin\/content$/, { timeout: 10_000 })
  })
})

test.describe('E2E · Admin panorama upload UX', () => {
  test('modal Thay ảnh hiện ảnh cũ + nút Chọn ảnh từ máy', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(ADMIN_USER.email)
    await page.locator('input[name="password"]').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(page).toHaveURL(/\/admin\/content/, { timeout: 15_000 })

    await page.getByRole('button', { name: /Panorama 360/i }).click()
    await page.getByRole('button', { name: 'Thay ảnh' }).first().click()

    await expect(page.getByText('Ảnh hiện tại')).toBeVisible()
    await expect(page.getByText('Ảnh thay thế')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Chọn ảnh từ máy' })).toBeVisible()
  })
})

test.describe('E2E · Admin CMS location context', () => {
  test('dropdown địa điểm có Củ Chi seed', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(ADMIN_USER.email)
    await page.locator('input[name="password"]').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(page).toHaveURL(/\/admin\/content/, { timeout: 15_000 })

    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    await expect(select.locator(`option[value="${SEED.cuChiLocationId}"]`)).toHaveCount(1)
  })
})
