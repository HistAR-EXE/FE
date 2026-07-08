import { test, expect } from '@playwright/test'
import { registerUnverified, verifyUserEmail } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('E2E · Email verification checkout', () => {
  test('AUTH-E05: unverified user sees disabled checkout → verify → enabled', async ({ page, request }) => {
    const user = await registerUnverified(request)
    await seedSession(page, user, { mode: 'online', emailVerified: false })

    await page.goto('/checkout/b2c')
    const payBtn = page.getByRole('button', { name: /Tạo thanh toán SePay/i })
    await expect(page.getByText(/Email chưa được xác thực/i)).toBeVisible({ timeout: 15_000 })
    await expect(payBtn).toBeDisabled()

    await verifyUserEmail(request, user.token, user.debugVerificationToken, user.userId)

    await page.evaluate(() => localStorage.setItem('timelens_email_verified', '1'))
    await page.goto('/checkout/b2c')
    await expect(payBtn).toBeEnabled({ timeout: 15_000 })
  })
})
