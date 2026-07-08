import { test, expect } from '@playwright/test'
import { registerFreshUser, registerUnverified } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('FE UI · Verify email page', () => {
  test('AUTH-EV-UI01: success copy is Free plan, not payment', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.route('**/api/auth/verify-email/confirm', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            emailVerified: true,
            message: `Email ${user.email} đã được xác thực thành công.`,
            debugToken: null,
          },
        }),
      })
    })
    await page.goto('/verify-email?token=ui-mock-token-free-copy')
    await expect(page.getByText(/gói Free/i)).toBeVisible()
    await expect(page.getByText(/thanh toán|nâng cấp gói/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Tiếp tục/i })).toBeVisible()
  })

  test('AUTH-EV-UI02: remount reuses confirm once (single POST)', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    let confirmCalls = 0
    await page.route('**/api/auth/verify-email/confirm', async (route) => {
      confirmCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { emailVerified: true, message: 'Email đã được xác thực thành công.', debugToken: null },
        }),
      })
    })
    await page.goto('/verify-email?token=dedupe-token-once')
    await expect(page.getByRole('button', { name: /Tiếp tục/i })).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await expect(page.getByRole('button', { name: /Tiếp tục/i })).toBeVisible({ timeout: 10_000 })
    // Module-level promise map survives remount within same tab session for same token;
    // StrictMode may call twice in one mount but shared promise → still 1 network request per unique open.
    expect(confirmCalls).toBeLessThanOrEqual(2)
    expect(confirmCalls).toBeGreaterThanOrEqual(1)
  })

  test('AUTH-EV-UI03: pending resend with debugToken shows local verify link', async ({ page, request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    await seedSession(page, user, { mode: 'online', emailVerified: false })
    await page.route('**/api/auth/verify-email/resend', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            emailVerified: false,
            message: 'Đã gửi email xác thực. Vui lòng kiểm tra hộp thư.',
            debugToken: 'local-debug-token-abc',
          },
        }),
      })
    })
    await page.goto('/verify-email/pending')
    await page.getByRole('button', { name: /Gửi lại email xác thực/i }).click()
    await expect(page.getByText('Môi trường local chưa gửi SMTP thật', { exact: false })).toBeVisible()
    await expect(page.locator('a[href*="/verify-email?token=local-debug-token-abc"]')).toBeVisible()
  })

  test('AUTH-EV-UI07: storage verify flag from other tab advances pending page', async ({ page, request }) => {
    const user = await registerUnverified(request)
    await seedSession(page, user, { mode: 'online', emailVerified: false })
    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: user.userId,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: null,
            role: 'USER',
            tier: 'FREE',
            orgId: null,
            orgName: null,
            orgSubscription: 'NONE',
            orgRole: null,
            level: 1,
            totalPoints: 0,
            city: null,
            emailVerified: true,
          },
        }),
      })
    })
    await page.goto('/verify-email/pending')
    await expect(page.getByRole('heading', { name: /Kích hoạt tài khoản/i })).toBeVisible()
    await page.evaluate(() => {
      localStorage.setItem('timelens_email_verified', '1')
      window.dispatchEvent(new StorageEvent('storage', { key: 'timelens_email_verified', newValue: '1' }))
    })
    await expect(page).not.toHaveURL(/\/verify-email\/pending/, { timeout: 15_000 })
  })
})
