import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, registerFreshUser, registerUnverified, unwrap } from '../helpers/api'
import { expectApiError } from '../helpers/errors'
import { getCuChiCharacterId } from '../helpers/monetization'

test.describe('BE API · Email verify flow (AUTH-EV)', () => {
  test('AUTH-EV01: register returns emailVerified=false', async ({ request }) => {
    const email = `ev_${Date.now()}@histar.vn`
    const res = await request.post(`${BE_URL}/api/auth/register`, {
      data: { email, password: 'E2ePass@2026', displayName: 'EV Tester' },
    })
    const data = await unwrap<{ emailVerified?: boolean; accessToken?: string }>(res)
    expect(data.emailVerified).toBe(false)
    expect(data.accessToken).toBeTruthy()
  })

  test('AUTH-EV02: login unverified returns emailVerified=false', async ({ request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    const loginRes = await request.post(`${BE_URL}/api/auth/login`, {
      data: { email: user.email, password: user.password },
    })
    const data = await unwrap<{ emailVerified?: boolean }>(loginRes)
    expect(data.emailVerified).toBe(false)
  })

  test('AUTH-EV03: unverified chat POST → 422 EMAIL_NOT_VERIFIED', async ({ request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    const characterId = await getCuChiCharacterId(request)
    const res = await request.post(`${BE_URL}/api/chat/messages`, {
      headers: authHeaders(user.token),
      data: { characterId, message: 'Xin chào' },
      failOnStatusCode: false,
    })
    await expectApiError(res, 422, 'xác thực email')
    const body = (await res.json()) as { code?: string }
    expect(body.code).toBe('EMAIL_NOT_VERIFIED')
  })

  test('AUTH-EV04: register debugToken → confirm → profile verified', async ({ request }) => {
    const user = await registerUnverified(request)
    test.skip(
      !user.debugVerificationToken,
      'Requires MAIL_ENABLED=false so register returns debugVerificationToken',
    )
    await unwrap(
      await request.post(`${BE_URL}/api/auth/verify-email/confirm`, {
        data: { token: user.debugVerificationToken },
      }),
    )
    const profile = await unwrap<{ emailVerified?: boolean }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    expect(profile.emailVerified).toBe(true)
  })

  test('AUTH-EV05: confirm twice same token → second call 422 used/invalid', async ({ request }) => {
    const user = await registerUnverified(request)
    test.skip(
      !user.debugVerificationToken,
      'Requires MAIL_ENABLED=false so register returns debugVerificationToken',
    )
    await unwrap(
      await request.post(`${BE_URL}/api/auth/verify-email/confirm`, {
        data: { token: user.debugVerificationToken },
      }),
    )
    const second = await request.post(`${BE_URL}/api/auth/verify-email/confirm`, {
      data: { token: user.debugVerificationToken },
      failOnStatusCode: false,
    })
    expect(second.status()).toBe(422)
    const body = (await second.json()) as { message?: string }
    expect(body.message ?? '').toMatch(/không hợp lệ|đã được sử dụng/i)
  })

  test('AUTH-EV06: MAIL_ENABLED=false verification token confirms (register or resend)', async ({ request }) => {
    const user = await registerUnverified(request)
    const resendRes = await request.post(`${BE_URL}/api/auth/verify-email/resend`, {
      headers: authHeaders(user.token),
      failOnStatusCode: false,
    })
    let debugToken = user.debugVerificationToken ?? null
    if (resendRes.ok()) {
      const resend = await unwrap<{ debugToken?: string | null }>(resendRes)
      if (resend.debugToken) debugToken = resend.debugToken
    }
    // Immediate resend after register often hits cooldown (AUTH-EV07); register debugToken still works when mail is off.
    test.skip(!debugToken, 'MAIL_ENABLED=true — no debugToken available')
    await unwrap(
      await request.post(`${BE_URL}/api/auth/verify-email/confirm`, {
        data: { token: debugToken },
      }),
    )
    const profile = await unwrap<{ emailVerified?: boolean }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    expect(profile.emailVerified).toBe(true)
  })

  test('AUTH-EV07: resend cooldown blocks immediate resend after register/send', async ({ request }) => {
    const user = await registerFreshUser(request, { skipEmailVerify: true })
    // Register already sent a verification email — immediate resend must hit cooldown.
    const second = await request.post(`${BE_URL}/api/auth/verify-email/resend`, {
      headers: authHeaders(user.token),
      failOnStatusCode: false,
    })
    expect(second.status()).toBe(422)
    const body = (await second.json()) as { message?: string }
    expect(body.message ?? '').toMatch(/đợi/i)
  })
})
