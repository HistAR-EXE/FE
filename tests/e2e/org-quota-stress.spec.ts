import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL, SEED } from '../helpers/constants'
import { createMicroOrgWithInvite, setOrgQuotaUsed } from '../helpers/monetization'
import { seedSession } from '../helpers/session'

test.describe('E2E · Org quota stress UI (GP-MON-04/05)', () => {
  test('GP-MON-04-UI: org student sees OrgQuotaModal when chat quota exceeded', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `Stress Micro ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'MICRO', contactEmail: teacher.email },
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )
    const student = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(student.token),
        data: { inviteCode: invite.inviteCode },
      }),
    )
    const profile = await unwrap<{ orgId?: string; orgSubscription?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(student.token) }),
    )

    await page.route('**/api/chat/messages', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Trường đã dùng hết AI Pool tháng này.',
          code: 'QUOTA_EXCEEDED',
          quotaType: 'ORG_MONTHLY',
        }),
      })
    })

    await seedSession(page, {
      ...student,
      orgId: profile.orgId ?? null,
      orgSubscription: profile.orgSubscription ?? 'MICRO',
    }, { mode: 'online' })

    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"], input[placeholder*="Nhắn tin cho"]').fill('Query sau khi hết org pool')
    await page.getByRole('button', { name: 'send', exact: true }).click()

    await expect(page.getByRole('heading', { name: /Hết lượt AI của trường/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/Trường bạn đã dùng hết AI Pool tháng này/i)).toBeVisible()
    await expect(page.getByText(/Standard \(30\.000 queries/i)).toBeVisible()
  })

  test('GP-MON-04-REAL: org student sees OrgQuotaModal when real pool exhausted', async ({
    page,
    request,
  }) => {
    const setup = await createMicroOrgWithInvite(request)
    const student = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(student.token),
        data: { inviteCode: setup.inviteCode },
      }),
    )
    const quota = await unwrap<{ aiQueriesLimit?: number | null }>(
      await request.get(`${BE_URL}/api/org/quota`, { headers: authHeaders(student.token) }),
    )
    const limit = quota.aiQueriesLimit ?? 5000
    const hooked = await setOrgQuotaUsed(request, setup.orgId, limit)
    test.skip(!hooked, 'HISTAR_TEST_HOOKS_ENABLED not set on BE')

    const profile = await unwrap<{ orgId?: string; orgSubscription?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(student.token) }),
    )
    await seedSession(page, {
      ...student,
      orgId: profile.orgId ?? setup.orgId,
      orgSubscription: profile.orgSubscription ?? 'MICRO',
    }, { mode: 'online' })

    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"], input[placeholder*="Nhắn tin cho"]').fill(
      'Query sau khi hết org pool (real)',
    )
    await page.getByRole('button', { name: 'send', exact: true }).click()

    await expect(page.getByRole('heading', { name: /Hết lượt AI của trường/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/Trường bạn đã dùng hết AI Pool tháng này/i)).toBeVisible()
  })

  test('GP-MON-04-TEACHER: teacher dashboard shows AI pool exhausted alert', async ({ page, request }) => {
    const setup = await createMicroOrgWithInvite(request)

    await page.route('**/api/org/*/dashboard-stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            verifiedAccounts: 10,
            maxVerifiedAccounts: 100,
            ccuCurrent: 5,
            maxCcu: 15,
            aiQueriesUsed: 5000,
            aiQueriesLimit: 5000,
            quotaResetsOn: '2026-03-01',
            planType: 'MICRO',
            isActive: true,
            daysUntilExpiry: 300,
            accountLimitReached: false,
            ccuLimitReached: false,
          },
        }),
      })
    })

    await seedSession(page, { ...setup.teacher, role: 'TEACHER' }, { mode: 'online' })
    await page.goto('/teacher')
    await expect(page.getByText(/Đã dùng hết AI Pool tháng này/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/5000\/5000|5\.000\/5\.000/).first()).toBeVisible()
  })

  test('GP-MON-05: org student can open tour after login (non-AI paths)', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: {
          orgName: `Stress Org ${Date.now()}`,
          planType: 'STANDARD',
          contactEmail: teacher.email,
        },
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )
    const student = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(student.token),
        data: { inviteCode: invite.inviteCode },
      }),
    )
    const profile = await unwrap<{ orgId?: string; orgSubscription?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(student.token) }),
    )
    await seedSession(page, {
      ...student,
      orgId: profile.orgId ?? null,
      orgSubscription: profile.orgSubscription ?? 'STANDARD',
    })
    await page.goto(`/tour/360/${SEED.cuChiLocationId}`)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 20_000 })
    await page.goto(`/time-portal/${SEED.cuChiLocationId}`)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 20_000 })
  })
})
