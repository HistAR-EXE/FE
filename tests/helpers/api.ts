import { type APIRequestContext, expect } from '@playwright/test'
import { BE_URL, DEMO_USER, TEST_HOOK_SECRET } from './constants'

export type LoginResult = {
  token: string
  userId: string
  role: string
  tier?: string
  displayName: string
}

/** Email/password fixtures (DEMO_USER, ADMIN_USER, TEACHER_USER, …). */
export type TestUserCreds = {
  email: string
  password: string
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

/** Đăng nhập bằng email/password, trả token + metadata. */
export async function login(
  request: APIRequestContext,
  creds: TestUserCreds = DEMO_USER,
  options?: { skipAutoVerify?: boolean },
): Promise<LoginResult> {
  const res = await request.post(`${BE_URL}/api/auth/login`, {
    data: { email: creds.email, password: creds.password },
    timeout: 60_000,
  })
  const data = await unwrap<{
    accessToken?: string
    token?: string
    userId?: string
    role?: string
    tier?: string
    displayName?: string
    emailVerified?: boolean
    user?: { id?: string; role?: string; tier?: string; displayName?: string }
  }>(res)
  const token = data.accessToken ?? data.token
  expect(token, 'login phải trả accessToken/token').toBeTruthy()
  if (!options?.skipAutoVerify && data.emailVerified === false) {
    await verifyUserEmail(request, token as string)
  }
  return {
    token: token as string,
    userId: data.userId ?? data.user?.id ?? '',
    role: data.role ?? data.user?.role ?? 'USER',
    tier: data.tier ?? data.user?.tier,
    displayName: data.displayName ?? data.user?.displayName ?? '',
  }
}

async function forceVerifyEmailViaTestHook(
  request: APIRequestContext,
  userId: string,
): Promise<boolean> {
  if (!userId) return false
  const res = await request.post(`${BE_URL}/api/test/auth/${userId}/verify-email`, {
    headers: { 'X-Test-Hook-Secret': TEST_HOOK_SECRET },
    failOnStatusCode: false,
    timeout: 30_000,
  })
  return res.ok()
}

/** Xác thực email qua debugToken (MAIL_ENABLED=false), resend+confirm, hoặc test hook. */
export async function verifyUserEmail(
  request: APIRequestContext,
  token: string,
  debugToken?: string | null,
  userId?: string,
): Promise<void> {
  if (debugToken) {
    const confirmRes = await request.post(`${BE_URL}/api/auth/verify-email/confirm`, {
      data: { token: debugToken },
      failOnStatusCode: false,
    })
    await unwrap(confirmRes)
    return
  }

  // Fast path: known userId + test hooks (CCU / TRIAL-B02 / GP-HUONG bulk) — never hit SMTP.
  if (userId && (await forceVerifyEmailViaTestHook(request, userId))) {
    return
  }

  const meRes = await request.get(`${BE_URL}/api/profile/me`, {
    headers: authHeaders(token),
    failOnStatusCode: false,
  })
  if (meRes.ok()) {
    const me = await unwrap<{ emailVerified?: boolean; id?: string }>(meRes)
    if (me.emailVerified) return
    if (!userId && me.id) userId = me.id
  }

  if (userId && (await forceVerifyEmailViaTestHook(request, userId))) {
    return
  }

  // Last resort: resend may return debugToken when MAIL is off; still can hit cooldown if MAIL on.
  const resendRes = await request.post(`${BE_URL}/api/auth/verify-email/resend`, {
    headers: authHeaders(token),
    failOnStatusCode: false,
  })
  if (resendRes.ok()) {
    const resend = await unwrap<{ emailVerified?: boolean; debugToken?: string | null }>(resendRes)
    if (resend.emailVerified) return
    if (resend.debugToken) {
      const confirmRes = await request.post(`${BE_URL}/api/auth/verify-email/confirm`, {
        data: { token: resend.debugToken },
        failOnStatusCode: false,
      })
      await unwrap(confirmRes)
      return
    }
  }

  expect(
    false,
    'Unable to verify email without SMTP: enable HISTAR_TEST_HOOKS_ENABLED + secret, or MAIL_ENABLED=false for debugToken. Do not rely on real SMTP in bulk tests.',
  ).toBeTruthy()
}

export async function registerUnverified(
  request: APIRequestContext,
): Promise<LoginResult & { email: string; password: string; debugVerificationToken?: string | null }> {
  const email = `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@histar.vn`
  const password = 'E2ePass@2026'
  const res = await request.post(`${BE_URL}/api/auth/register`, {
    data: { email, password, displayName: 'E2E Tester' },
    failOnStatusCode: false,
    timeout: 60_000,
  })
  expect([200, 201], `register status: ${res.status()} ${await res.text()}`).toContain(res.status())
  const data = await unwrap<{
    accessToken?: string
    token?: string
    userId?: string
    role?: string
    tier?: string
    displayName?: string
    debugVerificationToken?: string | null
  }>(res)
  const authToken = data.accessToken ?? data.token
  expect(authToken, 'register phải trả accessToken/token').toBeTruthy()
  return {
    token: authToken as string,
    userId: data.userId ?? '',
    role: data.role ?? 'USER',
    tier: data.tier,
    displayName: data.displayName ?? 'E2E Tester',
    email,
    password,
    debugVerificationToken: data.debugVerificationToken,
  }
}

export async function registerFreshUser(
  request: APIRequestContext,
  options?: { skipEmailVerify?: boolean },
): Promise<LoginResult & { email: string; password: string }> {
  const registered = await registerUnverified(request)
  if (!options?.skipEmailVerify) {
    await verifyUserEmail(
      request,
      registered.token,
      registered.debugVerificationToken,
      registered.userId,
    )
  }
  return registered
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}
