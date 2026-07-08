import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import { getPremiumFrameId } from '../helpers/monetization'
import { confirmB2cPaymentViaWebhook, createB2cPaymentIntent } from '../helpers/sepay'
import { seedSession } from '../helpers/session'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('E2E · AC-M09 photo frame tier lock', () => {
  test('AC-M09-FREE: premium frame shows UpgradePrompt and disabled submit', async ({
    page,
    request,
  }) => {
    const user = await registerFreshUser(request)
    const premiumFrameId = await getPremiumFrameId(request)
    await seedSession(page, user, { mode: 'online' })

    await page.goto('/photo-frame')
    await expect(page.getByRole('heading', { name: /Khung Hình Di Sản/i })).toBeVisible({
      timeout: 15_000,
    })
    await page.locator('select').selectOption(premiumFrameId)
    await expect(page.getByText(/Khung ảnh này dành cho gói Premium/i)).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await expect(page.getByRole('button', { name: 'Tạo & Chia sẻ' })).toBeDisabled()
  })

  test('AC-M09-PREMIUM: premium frame unlocked after upgrade', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    const intent = await createB2cPaymentIntent(request, user.token)
    await confirmB2cPaymentViaWebhook(request, intent, user.token)

    const profile = await unwrap<{ tier: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    const premiumFrameId = await getPremiumFrameId(request)
    await seedSession(page, { ...user, tier: profile.tier ?? 'PREMIUM' }, { mode: 'online' })

    await page.goto('/photo-frame')
    await page.locator('select').selectOption(premiumFrameId)
    await expect(page.getByText(/Khung ảnh này dành cho gói Premium/i)).toHaveCount(0)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await expect(page.getByRole('button', { name: 'Tạo & Chia sẻ' })).toBeEnabled()
  })
})
