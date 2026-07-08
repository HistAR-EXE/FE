import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('E2E · Classroom trial bad paths', () => {
  test('TRIAL-E2E-B01: seat-full join shows org-full error on Settings autoJoin', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Trial Seat UI ${Date.now()}`, contactEmail: teacher.email },
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )

    const student = await registerFreshUser(request)
    await seedSession(page, student, { mode: 'online' })

    await page.route('**/api/org/join', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'ORG_ACCOUNT_LIMIT',
          message: 'Tổ chức đã đạt giới hạn 11 tài khoản. Liên hệ giáo viên để nâng gói.',
        }),
      })
    })

    await page.goto(`/join?code=${invite.inviteCode}`)
    await expect(page.getByText(/Lớp học đã đủ số tài khoản/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('TRIAL-E2E-B02: quest/leaderboard shows trial-expired archive copy', async ({ page, request }) => {
    const student = await registerFreshUser(request)
    await seedSession(page, student, { mode: 'online' })

    await page.route('**/api/leaderboard**', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'TRIAL_EXPIRED',
          message: 'Lớp học dùng thử đã hết hạn. Dữ liệu bảng xếp hạng chỉ còn ở chế độ lưu trữ.',
        }),
      })
    })

    await page.goto('/leaderboard')
    await expect(page.getByText(/chế độ lưu trữ|hết hạn/i)).toBeVisible({ timeout: 15_000 })
  })
})
