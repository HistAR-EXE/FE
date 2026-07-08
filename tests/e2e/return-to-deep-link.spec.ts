import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap, verifyUserEmail } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import { setOrgInviteExpired } from '../helpers/monetization'
import { seedSession } from '../helpers/session'

test.describe('E2E · returnTo deep link', () => {
  test('RT-06: verified login via UI lands on /explore from returnTo', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await page.addInitScript(() => localStorage.setItem('timelens_mode', 'online'))
    await page.goto('/login?returnTo=%2Fexplore')
    await page.locator('input[name="email"]').fill(user.email)
    await page.locator('input[name="password"]').fill(user.password)
    await page.locator('form button[type="submit"]').click()
    await expect(page).toHaveURL(/\/explore/, { timeout: 20_000 })
  })

  test('AUTH-EV-E2E01: register → pending → verify → explore', async ({ page, request }) => {
    const email = `pending_${Date.now()}@histar.vn`
    const password = 'E2ePass@2026'
    await page.addInitScript(() => localStorage.setItem('timelens_mode', 'online'))
    const registerResponse = page.waitForResponse(
      (r) => r.url().includes('/api/auth/register') && r.request().method() === 'POST',
    )
    await page.goto('/login?returnTo=%2Fexplore')
    await page.getByRole('button', { name: 'Đăng Ký Mới', exact: true }).click()
    await page.locator('input[name="displayName"]').fill('Pending User')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('form button[type="submit"]').click()
    await expect(page).toHaveURL(/\/verify-email\/pending/, { timeout: 15_000 })

    const regRes = await registerResponse
    const regBody = (await regRes.json()) as { data?: { accessToken?: string; token?: string; debugVerificationToken?: string } }
    const token = regBody.data?.accessToken ?? regBody.data?.token
    const debugToken = regBody.data?.debugVerificationToken
    expect(token, 'register response must include token').toBeTruthy()
    await verifyUserEmail(request, token!, debugToken)

    await page.getByRole('button', { name: /Đã xác thực/i }).click()
    await expect(page).toHaveURL(/\/explore/, { timeout: 20_000 })
  })

  test('RT-05: /join guest → login returnTo preserved', async ({ page }) => {
    await page.goto('/join?code=NDU2026')
    await expect(page).toHaveURL(/\/login\?returnTo=.*join.*NDU2026/i)
  })

  test('RT-07: join invite expired shows error on settings autoJoin', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `RT07 Org ${Date.now()}`, planType: 'STANDARD', contactEmail: teacher.email },
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )
    const orgProfile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    const hooked = await setOrgInviteExpired(request, orgProfile.orgId)
    test.skip(!hooked, 'HISTAR_TEST_HOOKS_ENABLED required for invite-expire test hook')

    const student = await registerFreshUser(request)
    await seedSession(page, student, { mode: 'online' })
    await page.goto(`/join?code=${invite.inviteCode}`)
    await expect(page.getByText(/Link mời đã hết hạn hoặc không hợp lệ/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })
  })

  test('RT-09: Google login path stashes returnTo before OAuth popup', async ({ page }) => {
    await page.goto('/login?returnTo=%2Fexplore')
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('histar:returnTo')))
      .toBe('/explore')
    await expect(page.getByRole('button', { name: /Tiếp tục với Google ID/i })).toBeVisible()
    // handleGoogleLogin re-stashes returnTo immediately before popup; assert stash survives
    // without opening real Firebase popup (human-only AUTH-G01).
    const stillStashed = await page.evaluate(() => sessionStorage.getItem('histar:returnTo'))
    expect(stillStashed).toBe('/explore')
  })
})
