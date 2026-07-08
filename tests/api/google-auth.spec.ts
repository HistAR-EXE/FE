import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { unwrap } from '../helpers/api'
import { loadContract } from '../helpers/contracts'

const GOOGLE_HOOK_FIXTURE = loadContract<{
  idToken: string
  expectedEmail: string
}>(`google-test-id-token.json`)

test.describe('BE API · Google OAuth', () => {
  test('AUTH-G02: empty idToken → 400', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/auth/google`, {
      data: { idToken: '' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('AUTH-G03: invalid idToken → 422', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/auth/google`, {
      data: { idToken: 'invalid-smoke-token-not-from-google' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    const body = (await res.json()) as { message?: string; success?: boolean }
    const msg = (body.message ?? JSON.stringify(body)).toLowerCase()
    expect(msg).toMatch(/token google|không hợp lệ|cấu hình/)
  })

  test('AUTH-G10: Google idToken round-trip via test-hook fixture', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/auth/google`, {
      data: { idToken: GOOGLE_HOOK_FIXTURE.idToken },
    })
    const auth = await unwrap<{ accessToken?: string; token?: string }>(res)
    const access = auth.accessToken ?? auth.token
    expect(access).toBeTruthy()

    const profileRes = await request.get(`${BE_URL}/api/profile/me`, {
      headers: { Authorization: `Bearer ${access}` },
    })
    const profile = await unwrap<{ email?: string; emailVerified?: boolean }>(profileRes)
    expect(profile.emailVerified).toBe(true)
    expect(profile.email).toBe(GOOGLE_HOOK_FIXTURE.expectedEmail)
  })
})
