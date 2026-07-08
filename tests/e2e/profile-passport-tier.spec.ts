import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import { confirmB2cPaymentViaWebhook, createB2cPaymentIntent } from '../helpers/sepay'
import { seedSession } from '../helpers/session'

test.describe('E2E · AC-M06 passport tier lock', () => {
  test('AC-M06-FREE: passport tab shows preview locked overlay', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto('/profile')
    await page.getByRole('button', { name: /Hộ chiếu & Huy hiệu/i }).click()

    await expect(page.getByText(/Preview bị khóa — Premium/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /Digital Passport — Premium/i })).toBeVisible()
  })

  test('AC-M06-PREMIUM: passport overlay hidden after upgrade', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    const intent = await createB2cPaymentIntent(request, user.token)
    await confirmB2cPaymentViaWebhook(request, intent, user.token)

    const profile = await unwrap<{ tier: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    await seedSession(page, { ...user, tier: profile.tier ?? 'PREMIUM' }, { mode: 'online' })

    await page.goto('/profile')
    await page.getByRole('button', { name: /Hộ chiếu & Huy hiệu/i }).click()
    await expect(page.getByRole('heading', { name: /Hộ chiếu Di sản/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/Preview bị khóa — Premium/i)).toHaveCount(0)
  })
})
