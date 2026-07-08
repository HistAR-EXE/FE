import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, registerFreshUser, registerUnverified, unwrap, verifyUserEmail } from '../helpers/api'
import { expectApiError } from '../helpers/errors'

test.describe('BE API · Email verification', () => {
  test('unverified user cannot B2B subscribe (AUTH-E01)', async ({ request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    const res = await request.post(`${BE_URL}/api/billing/org/subscribe`, {
      headers: authHeaders(user.token),
      data: {
        orgName: `Unverified Org ${Date.now()}`,
        planType: 'STANDARD',
        contactEmail: user.email,
      },
      failOnStatusCode: false,
    })
    await expectApiError(res, 422, 'xác thực email')
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('EMAIL_NOT_VERIFIED')
  })

  test('unverified user cannot create SePay B2C payment (AUTH-E02)', async ({ request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    const res = await request.post(`${BE_URL}/api/billing/b2c/payment`, {
      headers: authHeaders(user.token),
      data: { returnToPath: '/settings' },
      failOnStatusCode: false,
    })
    if (res.status() === 503 || res.status() === 404) {
      test.skip(true, 'SePay not enabled on backend')
      return
    }
    await expectApiError(res, 422, 'xác thực email')
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('EMAIL_NOT_VERIFIED')
  })

  test('unverified user cannot B2C subscribe (EMAIL_NOT_VERIFIED)', async ({ request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    const res = await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
      headers: authHeaders(user.token),
      data: { paymentMethod: 'DEMO' },
      failOnStatusCode: false,
    })
    await expectApiError(res, 422, 'xác thực email')
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('EMAIL_NOT_VERIFIED')
  })

  test('unverified user cannot create org SePay payment (AUTH-E04)', async ({ request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    const res = await request.post(`${BE_URL}/api/billing/org/payment`, {
      headers: authHeaders(user.token),
      data: {
        orgName: `Unverified SePay ${Date.now()}`,
        planType: 'STANDARD',
        contactEmail: user.email,
        returnToPath: '/teacher',
      },
      failOnStatusCode: false,
    })
    if (res.status() === 503 || res.status() === 404) {
      test.skip(true, 'SePay not enabled on backend')
      return
    }
    await expectApiError(res, 422, 'xác thực email')
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('EMAIL_NOT_VERIFIED')
  })

  test('AUTH-E03: register → verify → B2C subscribe succeeds', async ({ request }) => {
    const user = await registerUnverified(request)
    await verifyUserEmail(request, user.token, user.debugVerificationToken, user.userId)

    const profileRes = await request.get(`${BE_URL}/api/profile/me`, {
      headers: authHeaders(user.token),
    })
    const profile = await unwrap<{ emailVerified?: boolean }>(profileRes)
    expect(profile.emailVerified).toBe(true)

    const subscribeRes = await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
      headers: authHeaders(user.token),
      data: { paymentMethod: 'DEMO' },
    })
    await unwrap(subscribeRes)
  })
})
