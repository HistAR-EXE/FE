import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'

test.describe('BE API · B2C expiry status', () => {
  test('B2C-EXP-API-01: /api/billing/b2c/status includes daysUntilExpiry', async ({ request }) => {
    const user = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
        headers: authHeaders(user.token),
        data: { paymentMethod: 'DEMO' },
      }),
    )
    const status = await unwrap<{
      tier: string
      isActive: boolean
      daysUntilExpiry?: number
    }>(
      await request.get(`${BE_URL}/api/billing/b2c/status`, {
        headers: authHeaders(user.token),
      }),
    )
    expect(status.tier).toBe('PREMIUM')
    expect(status.isActive).toBe(true)
    expect(typeof status.daysUntilExpiry).toBe('number')
  })
})
