import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL, SEED } from '../helpers/constants'
import { seedSession } from '../helpers/session'
import { gotoTimePortalAndClickEra } from '../helpers/timePortal'

test.describe('E2E · Seamless upgrade', () => {
  test('FLOW-H01: FREE → Premium via API unlocks era without re-login', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })

    await gotoTimePortalAndClickEra(page, SEED.cuChiLocationId, '1948')
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toBeVisible()

    await unwrap(
      await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
        headers: authHeaders(user.token),
        data: { paymentMethod: 'DEMO' },
      }),
    )

    const profile = await unwrap<{ tier: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    expect(profile.tier).toBe('PREMIUM')

    await seedSession(page, { ...user, tier: 'PREMIUM' }, { mode: 'online' })
    await gotoTimePortalAndClickEra(page, SEED.cuChiLocationId, '1948')
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toHaveCount(0)
    await expect(page).not.toHaveURL(/\/login/)
  })
})
