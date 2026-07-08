import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('E2E · Google verified checkout', () => {
  test('AUTH-G09: verified user (post-Google state) can enable B2C checkout', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    const profile = await unwrap<{ emailVerified?: boolean }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    expect(profile.emailVerified).toBe(true)

    await seedSession(page, user, { mode: 'online' })
    await page.goto('/checkout/b2c')
    await expect(page.getByRole('button', { name: /Tạo thanh toán SePay/i })).toBeEnabled({ timeout: 15_000 })
  })
})
