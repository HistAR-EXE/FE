import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import {
  assertQrUrlAmount,
  getAdminBillingSettings,
  getPublicPricing,
  loginAsAdmin,
  setB2cPremiumPrice,
} from '../helpers/monetization'
import {
  buildSepayWebhookPayload,
  confirmB2cPaymentViaWebhook,
  createB2cPaymentIntent,
  createOrgPaymentIntent,
  postSepayWebhook,
} from '../helpers/sepay'

const DEFAULT_B2C_PRICE = 49_000

test.describe('BE API · Admin billing & dynamic SePay QR', () => {
  test.describe.configure({ mode: 'serial' })

  test('MON-H12: GET /api/billing/public-pricing returns default B2C price', async ({ request }) => {
    const pricing = await getPublicPricing(request)
    expect(pricing.b2cPremiumPriceVnd).toBeGreaterThanOrEqual(1000)
    expect(pricing.chatFreeDailyLimit).toBeGreaterThanOrEqual(5)
    expect(pricing.orgPlans.length).toBeGreaterThanOrEqual(3)
    const standard = pricing.orgPlans.find((p) => p.planType === 'STANDARD')
    expect(standard?.priceVnd).toBe(15_000_000)
  })

  test('MON-H13: admin PATCH settings updates public-pricing', async ({ request }) => {
    const admin = await loginAsAdmin(request)
    const before = await getAdminBillingSettings(request, admin.token)
    const targetPrice = before.b2cPremiumPriceVnd === 59_000 ? 58_000 : 59_000

    try {
      const updated = await setB2cPremiumPrice(request, admin.token, targetPrice)
      expect(updated.b2cPremiumPriceVnd).toBe(targetPrice)

      const publicPricing = await getPublicPricing(request)
      expect(publicPricing.b2cPremiumPriceVnd).toBe(targetPrice)
    } finally {
      await setB2cPremiumPrice(request, admin.token, before.b2cPremiumPriceVnd)
    }
  })

  test('MON-H14: B2C payment intent amount + qrUrl reflect admin price', async ({ request }) => {
    const admin = await loginAsAdmin(request)
    const user = await registerFreshUser(request)
    const before = await getAdminBillingSettings(request, admin.token)
    const dynamicPrice = before.b2cPremiumPriceVnd === 59_000 ? 58_000 : 59_000

    try {
      await setB2cPremiumPrice(request, admin.token, dynamicPrice)
      const intent = await createB2cPaymentIntent(request, user.token)
      expect(intent.amountVnd).toBe(dynamicPrice)
      assertQrUrlAmount(intent.qrUrl, dynamicPrice)
    } finally {
      await setB2cPremiumPrice(request, admin.token, before.b2cPremiumPriceVnd)
    }
  })

  test('MON-H15: B2B STANDARD payment intent amount + qrUrl is 15M', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `MON-H15 ${Date.now()}`
    const intent = await createOrgPaymentIntent(request, teacher.token, {
      orgName,
      planType: 'STANDARD',
      contactEmail: teacher.email,
    })
    expect(intent.orderCode).toMatch(/^ORG/)
    expect(intent.amountVnd).toBe(15_000_000)
    assertQrUrlAmount(intent.qrUrl, 15_000_000)
  })

  test('MON-H16: B2B PREMIUM payment intent amount + qrUrl is 25M', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `MON-H16 ${Date.now()}`
    const intent = await createOrgPaymentIntent(request, teacher.token, {
      orgName,
      planType: 'PREMIUM',
      contactEmail: teacher.email,
    })
    expect(intent.orderCode).toMatch(/^ORG/)
    expect(intent.amountVnd).toBe(25_000_000)
    assertQrUrlAmount(intent.qrUrl, 25_000_000)
  })

  test('MON-H17: B2B MICRO payment intent amount + qrUrl is 8M', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `MON-H17 ${Date.now()}`
    const intent = await createOrgPaymentIntent(request, teacher.token, {
      orgName,
      planType: 'MICRO',
      contactEmail: teacher.email,
    })
    expect(intent.orderCode).toMatch(/^ORG/)
    expect(intent.amountVnd).toBe(8_000_000)
    assertQrUrlAmount(intent.qrUrl, 8_000_000)
  })

  test('MON-B07: SePay webhook rejects invalid HMAC signature', async ({ request }) => {
    const res = await postSepayWebhook(
      request,
      buildSepayWebhookPayload('INVALID', 49_000),
      { signature: 'sha256=invalid' },
    )
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('MON-B08: webhook with insufficient amount does not upgrade tier', async ({ request }) => {
    const user = await registerFreshUser(request)
    const intent = await createB2cPaymentIntent(request, user.token)

    const badPayload = buildSepayWebhookPayload(intent.orderCode, Math.max(1000, intent.amountVnd - 1000))
    await unwrap(await postSepayWebhook(request, badPayload))

    const paymentStatus = await unwrap<{ status: string; upgraded: boolean }>(
      await request.get(`${BE_URL}/api/billing/b2c/payment/${intent.orderCode}`, {
        headers: authHeaders(user.token),
      }),
    )
    expect(paymentStatus.status).not.toBe('PAID')
    expect(paymentStatus.upgraded).toBeFalsy()

    const profile = await unwrap<{ tier: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    expect(profile.tier).not.toBe('PREMIUM')

    // Cleanup: pay full amount so pending order does not leak state
    await confirmB2cPaymentViaWebhook(request, intent, user.token)
  })
})
