import { type APIRequestContext, expect } from '@playwright/test'
import { BE_URL, DEMO_USER } from './constants'

export type LoginResult = {
  token: string
  userId: string
  role: string
  tier?: string
  displayName: string
}

/** Bóc `{ success, data }` và fail rõ ràng nếu API trả lỗi. */
export async function unwrap<T>(res: { ok(): boolean; status(): number; json(): Promise<unknown>; text(): Promise<string> }): Promise<T> {
  const status = res.status()
  const bodyText = await res.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(bodyText)
  } catch {
    throw new Error(`Non-JSON response (status ${status}): ${bodyText.slice(0, 200)}`)
  }
  const body = parsed as { success?: boolean; data?: T; message?: string }
  expect(res.ok(), `Expected 2xx but got ${status}: ${body.message ?? bodyText.slice(0, 200)}`).toBeTruthy()
  return body.data as T
}

/** Đăng nhập demo user, trả token + metadata. */
export async function login(request: APIRequestContext, creds = DEMO_USER): Promise<LoginResult> {
  const res = await request.post(`${BE_URL}/api/auth/login`, {
    data: { email: creds.email, password: creds.password },
  })
  const data = await unwrap<{
    accessToken?: string
    token?: string
    userId?: string
    role?: string
    tier?: string
    displayName?: string
    user?: { id?: string; role?: string; tier?: string; displayName?: string }
  }>(res)
  const token = data.accessToken ?? data.token
  expect(token, 'login phải trả accessToken/token').toBeTruthy()
  return {
    token: token as string,
    userId: data.userId ?? data.user?.id ?? '',
    role: data.role ?? data.user?.role ?? 'USER',
    tier: data.tier ?? data.user?.tier,
    displayName: data.displayName ?? data.user?.displayName ?? '',
  }
}

/** Đăng ký user mới ngẫu nhiên (BR-01: đăng ký mở, không cần invitation). */
export async function registerFreshUser(request: APIRequestContext): Promise<LoginResult & { email: string; password: string }> {
  const email = `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@histar.vn`
  const password = 'E2ePass@2026'
  const res = await request.post(`${BE_URL}/api/auth/register`, {
    data: { email, password, displayName: 'E2E Tester' },
    failOnStatusCode: false,
  })
  expect([200, 201], `register status: ${res.status()} ${await res.text()}`).toContain(res.status())
  const result = await login(request, { email, password })
  return { ...result, email, password }
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}
