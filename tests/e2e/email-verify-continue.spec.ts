import { test, expect } from '@playwright/test'
import { registerFreshUser, registerUnverified, verifyUserEmail } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('E2E · Email verify continue + route gate', () => {
  test('AUTH-EV-E2E02: confirm UI → Tiếp tục → /mode-select without pending bounce', async ({
    page,
    request,
  }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    await seedSession(page, user, { mode: 'online', emailVerified: false })
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
    await page.goto('/verify-email?token=e2e-continue-mock-token')
    await expect(page.getByText(/gói Free/i)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Tiếp tục/i }).click()
    await expect(page).toHaveURL(/\/mode-select/, { timeout: 15_000 })
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/mode-select/)
    await expect(page).not.toHaveURL(/\/verify-email/)
  })

  test('AUTH-EV-E2E02r: real debugToken confirm when MAIL_ENABLED=false', async ({ page, request }) => {
    const user = await registerUnverified(request)
    test.skip(!user.debugVerificationToken, 'Requires MAIL_ENABLED=false debug token')
    await seedSession(page, user, { mode: 'online', emailVerified: false })
    await page.goto(`/verify-email?token=${user.debugVerificationToken}`)
    await expect(page.getByText(/đã được xác thực thành công|gói Free/i).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Tiếp tục/i }).click()
    await expect(page).toHaveURL(/\/mode-select/, { timeout: 15_000 })
  })

  test('AUTH-EV-E2E03: unverified user hitting /mode-select and /home is sent to pending', async ({
    page,
    request,
  }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    await seedSession(page, user, { mode: 'online', emailVerified: false })
    await page.goto('/mode-select')
    await expect(page).toHaveURL(/\/verify-email\/pending/, { timeout: 15_000 })
    await page.goto('/home')
    await expect(page).toHaveURL(/\/verify-email\/pending/, { timeout: 15_000 })
  })

  test('AUTH-EV-E2E04: unverified /explore → pending', async ({ page, request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    await seedSession(page, user, { mode: 'online', emailVerified: false })
    await page.goto('/explore')
    await expect(page).toHaveURL(/\/verify-email\/pending/, { timeout: 15_000 })
  })

  test('AUTH-EV-E2E05: verified user can stay on /mode-select', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online', emailVerified: true })
    await page.goto('/mode-select')
    await expect(page).toHaveURL(/\/mode-select/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/\/verify-email/)
  })

  test('AUTH-EV-E2E02b: after API verify, pending Continue leaves verify flow', async ({
    page,
    request,
  }) => {
    const user = await registerUnverified(request)
    test.skip(!user.debugVerificationToken, 'Requires MAIL_ENABLED=false to verify without inbox')
    await seedSession(page, user, { mode: 'online', emailVerified: false })
    await page.goto('/verify-email/pending')
    await verifyUserEmail(request, user.token, user.debugVerificationToken)
    await page.getByRole('button', { name: /Đã xác thực/i }).click()
    await expect(page).not.toHaveURL(/\/verify-email\/pending/, { timeout: 20_000 })
  })
})
