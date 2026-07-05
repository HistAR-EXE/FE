import { test, expect } from '@playwright/test'
import { ADMIN_USER, TEACHER_USER } from '../helpers/constants'
import { BE_URL } from '../helpers/constants'
import { login, registerFreshUser } from '../helpers/api'

/**
 * §11 Role × UI audit — nút/nav theo role.
 */
test.describe('E2E · Role UI', () => {
  test('ROLE-UI-G1: guest /admin/content → không ở CMS', async ({ page }) => {
    await page.goto('/admin/content')
    await expect(page).not.toHaveURL(/\/admin\/content$/, { timeout: 10_000 })
  })

  test('ROLE-UI-A1: ADMIN login → /admin/content', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(ADMIN_USER.email)
    await page.locator('input[name="password"]').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(page).toHaveURL(/\/admin\/content$/, { timeout: 15_000 })
  })

  test('ROLE-UI-A2: ADMIN tab Hiện vật có nút Thêm', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(ADMIN_USER.email)
    await page.locator('input[name="password"]').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(page).toHaveURL(/\/admin\/content/, { timeout: 15_000 })
    await page.getByRole('button', { name: /Hiện vật/i }).click()
    await expect(page.getByRole('button', { name: 'Thêm hiện vật' })).toBeVisible()
  })

  test('ROLE-UI-A3: ADMIN Cài đặt không có link CMS; sidebar có Quản trị', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(ADMIN_USER.email)
    await page.locator('input[name="password"]').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Chỉnh sửa hồ sơ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lớp học' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Người dùng/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Nội dung/i })).toHaveCount(0)

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/home')
    await expect(page.getByRole('link', { name: /Quản trị/i })).toBeVisible()
  })

  test('ROLE-UI-A4: ADMIN analytics có AdminSubNav', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(ADMIN_USER.email)
    await page.locator('input[name="password"]').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await page.goto('/admin/analytics')
    await expect(page.getByRole('navigation', { name: 'Điều hướng quản trị' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Nội dung/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Thống kê/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Người dùng/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Tổ chức/i })).toBeVisible()
  })

  test('ROLE-UI-A5: ADMIN /settings chỉ tài khoản cá nhân', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(ADMIN_USER.email)
    await page.locator('input[name="password"]').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Chỉnh sửa hồ sơ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible()
    await expect(page.getByPlaceholder('Nhập mã mời lớp')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Nâng cấp Premium/i })).toHaveCount(0)
  })

  test('ROLE-UI-T3: TEACHER /settings có Dashboard lớp, không mã mời', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(TEACHER_USER.email)
    await page.locator('input[name="password"]').fill(TEACHER_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await page.goto('/settings')
    await expect(page.getByRole('link', { name: /Dashboard lớp/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lớp học' })).toHaveCount(0)
    await expect(page.getByPlaceholder('Nhập mã mời lớp')).toHaveCount(0)
  })

  test('ROLE-UI-T1: TEACHER login → /teacher', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(TEACHER_USER.email)
    await page.locator('input[name="password"]').fill(TEACHER_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(page).toHaveURL(/\/teacher$/, { timeout: 15_000 })
  })

  test('ROLE-UI-T2: TEACHER dashboard có mã mời', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(TEACHER_USER.email)
    await page.locator('input[name="password"]').fill(TEACHER_USER.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(page.getByText(/Mã mời tổ chức/i)).toBeVisible({ timeout: 15_000 })
  })

  test('ROLE-UI-U1: USER Settings có org join + groups', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await page.goto('/login')
    await page.locator('input[name="email"]').fill(user.email)
    await page.locator('input[name="password"]').fill(user.password)
    await page.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(page).toHaveURL(/\/mode-select$/, { timeout: 15_000 })

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Lớp học' })).toBeVisible()
    await expect(page.getByPlaceholder('Nhập mã mời lớp')).toBeVisible()
    await expect(page.getByRole('link', { name: /Quản lý nhóm học tập/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Người dùng/i })).toHaveCount(0)
  })
})

test.describe('API · Role guards', () => {
  test('ROLE-UI-B1: USER GET /api/admin/users → 403', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.get(`${BE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${user.token}` },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(403)
  })

  test('ROLE-UI-B2: USER POST invite-code → 403', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.post(`${BE_URL}/api/org/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/invite-code`, {
      headers: { Authorization: `Bearer ${user.token}` },
      failOnStatusCode: false,
    })
    expect([403, 404]).toContain(res.status())
  })
})
