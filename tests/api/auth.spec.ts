import { test, expect } from '@playwright/test'
import { BE_URL, DEMO_USER } from '../helpers/constants'
import { login, registerFreshUser, authHeaders, unwrap } from '../helpers/api'
import { expectStatus } from '../helpers/errors'

/**
 * Tầng 1 · LUỒNG 1 (Auth & Onboarding) — BR-01, BR-02.
 */
test.describe('BE API · Auth', () => {
  test('BR-01: đăng ký mở, không cần invitation token', async ({ request }) => {
    const user = await registerFreshUser(request)
    expect(user.token).toBeTruthy()
    expect(user.role, 'role mặc định phải là USER').toBe('USER')
  })

  test('login demo trả accessToken + role', async ({ request }) => {
    const s = await login(request, DEMO_USER)
    expect(s.token).toBeTruthy()
    expect(['USER', 'ADMIN', 'TEACHER']).toContain(s.role)
  })

  test('login sai mật khẩu → 401, không lộ token', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/auth/login`, {
      data: { email: DEMO_USER.email, password: 'wrong-password-xxx' },
      failOnStatusCode: false,
    })
    expect(res.status(), 'sai mật khẩu phải 401').toBe(401)
  })

  test('BR-02: endpoint bảo vệ từ chối khi thiếu JWT', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/profile/me`, { failOnStatusCode: false })
    expect(res.status(), 'không token → 401').toBe(401)
  })

  test('BR-02: /api/profile/me hợp lệ với JWT', async ({ request }) => {
    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(s.token) })
    const profile = await unwrap<{ email: string; level: number; totalPoints: number }>(res)
    expect(profile.email).toBe(DEMO_USER.email)
    expect(typeof profile.level).toBe('number')
  })

  test('AUTH-H4: refresh token rotate', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/auth/login`, {
      data: { email: DEMO_USER.email, password: DEMO_USER.password },
    })
    const loginData = await unwrap<{ accessToken?: string; token?: string; refreshToken: string }>(res)
    const refreshToken = loginData.refreshToken
    expect(refreshToken).toBeTruthy()

    const refreshRes = await request.post(`${BE_URL}/api/auth/refresh`, {
      data: { refreshToken },
    })
    const refreshed = await unwrap<{ refreshToken: string; accessToken?: string; token?: string }>(refreshRes)
    expect(refreshed.refreshToken).toBeTruthy()
    expect(refreshed.refreshToken).not.toBe(refreshToken)
  })

  test('AUTH-B3: email trùng register → 409', async ({ request }) => {
    const first = await registerFreshUser(request)
    const dup = await request.post(`${BE_URL}/api/auth/register`, {
      data: { email: first.email, password: first.password, displayName: 'Dup' },
      failOnStatusCode: false,
    })
    await expectStatus(dup, 409)
  })
})
