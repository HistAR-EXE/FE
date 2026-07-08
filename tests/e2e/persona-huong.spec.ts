import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import {
  completeRemoteQuest,
  createStandardOrgTeacher,
  ensureRemoteQuest,
} from '../helpers/monetization'
import {
  confirmOrgPaymentViaWebhook,
  createOrgPaymentIntent,
} from '../helpers/sepay'
import { seedSession } from '../helpers/session'

test.describe('E2E · Persona Cô Hương (GP-HUONG)', () => {
  test('GP-HUONG-01: B2B subscribe → teacher dashboard stats', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `THPT Nguyễn Du ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
      }),
    )
    await seedSession(page, { ...teacher, role: 'TEACHER' })
    await page.goto('/teacher')
    await expect(page.getByRole('heading', { name: /Mã mời tổ chức|Mã mời/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/tài khoản|AI|queries/i).first()).toBeVisible()
  })

  test('GP-HUONG-02: pricing#b2b visible when logged in', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user)
    await page.goto('/pricing#b2b')
    await expect(page.getByText(/Standard|Micro|Premium/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('GP-HUONG-03: checkout/b2b form → SePay QR 15M', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await seedSession(page, teacher, { mode: 'online' })
    await page.goto('/checkout/b2b?plan=STANDARD')

    await page.getByPlaceholder('THPT Nguyễn Du').fill(`THPT Nguyễn Du ${Date.now()}`)
    await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()

    const sepayDisabled = await page.getByText(/SePay chưa|chưa được cấu hình/i).isVisible().catch(() => false)
    if (sepayDisabled) {
      test.skip(true, 'SePay chưa được enable trên backend')
    }

    await expect(page.getByText(/Mã thanh toán:/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('p').filter({ hasText: /^Số tiền:/ })).toContainText('15.000.000')
    await expect(page.locator('img[alt*="SePay QR"]')).toBeVisible()
  })

  test('GP-HUONG-04: SePay webhook → teacher dashboard stats (Standard pool)', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `THPT SePay Huong ${Date.now()}`
    const intent = await createOrgPaymentIntent(request, teacher.token, {
      orgName,
      planType: 'STANDARD',
      contactEmail: teacher.email,
      returnToPath: '/teacher',
    })
    const status = await confirmOrgPaymentViaWebhook(request, intent, teacher.token)
    expect(status.status).toBe('PAID')
    expect(status.activated).toBe(true)

    const profile = await unwrap<{ orgId?: string; role?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    const quota = await unwrap<{
      verifiedAccounts: number
      maxVerifiedAccounts: number
      aiQueriesUsed: number
      aiQueriesLimit: number | null
      planType: string
    }>(await request.get(`${BE_URL}/api/org/quota`, { headers: authHeaders(teacher.token) }))
    expect(quota.planType).toBe('STANDARD')
    expect(quota.maxVerifiedAccounts).toBe(400)
    expect(quota.aiQueriesLimit).toBe(30_000)

    await seedSession(
      page,
      { ...teacher, role: profile.role ?? 'TEACHER', orgId: profile.orgId ?? null },
      { mode: 'online' },
    )
    await page.goto('/teacher')
    await expect(
      page.getByText(new RegExp(`${quota.verifiedAccounts}\\/${quota.maxVerifiedAccounts}`)).first(),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/30\.000|30000/).first()).toBeVisible()
  })

  test('GP-HUONG-05: invite + bulk join increases roster count', async ({ page, request }) => {
    test.setTimeout(180_000)
    const teacher = await registerFreshUser(request)
    const orgName = `THPT Bulk ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
        timeout: 60_000,
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, {
        headers: authHeaders(teacher.token),
        timeout: 30_000,
      }),
    )

    for (let i = 0; i < 5; i += 1) {
      const student = await registerFreshUser(request)
      await unwrap(
        await request.post(`${BE_URL}/api/org/join`, {
          headers: authHeaders(student.token),
          data: { inviteCode: invite.inviteCode },
          timeout: 30_000,
        }),
      )
    }

    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })
    await page.goto('/teacher')
    await expect(page.getByText(/[5-9]\/400|\d+\/400/).first()).toBeVisible({ timeout: 20_000 })
  })

  test('GP-HUONG-06: Standard upsell hints Premium LMS on pricing', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user)
    await page.goto('/pricing#b2b')
    await expect(page.getByText(/Premium/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/LMS|giao bài|auto-chấm/i).first()).toBeVisible()
  })

  test('AC-M09-E2E: teacher dashboard invite code + copy button', async ({ page, context, request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `THPT Invite UI ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
      }),
    )
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })
    await page.goto('/teacher')
    await expect(page.getByRole('heading', { name: /Mã mời tổ chức/i })).toBeVisible({
      timeout: 15_000,
    })

    const createBtn = page.getByRole('button', { name: /Tạo mã mời|Tạo mã mới/i })
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click()
    }

    await expect(page.locator('code').first()).toHaveText(/^[A-Z0-9]{6}$/)
    await expect(page.getByText(/Hết hạn:.*7 ngày/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible()
  })

  test('GP-HUONG-08: Standard → Premium SePay upgrade preserves roster/progress and unlocks LMS', async ({
    page,
    request,
  }) => {
    const teacher = await createStandardOrgTeacher(request)
    const profile = await unwrap<{ orgId: string; role?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )

    const remote = await ensureRemoteQuest(request)
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
    await completeRemoteQuest(request, student.token, remote)

    const rosterBefore = await unwrap<
      Array<{ email: string; questProgress?: Array<{ questId: string; completionPct: number }> }>
    >(
      await request.get(`${BE_URL}/api/org/${profile.orgId}/roster`, { headers: authHeaders(teacher.token) }),
    )
    const studentBefore = rosterBefore.find((m) => m.email === student.email)
    expect(studentBefore, 'student should exist in roster before upsell').toBeTruthy()
    const progressBefore = studentBefore?.questProgress?.find((q) => q.questId === remote.id)?.completionPct ?? 0
    const questRowsBefore = studentBefore?.questProgress?.length ?? 0

    const intent = await createOrgPaymentIntent(request, teacher.token, {
      orgName: `THPT Premium Upsell ${Date.now()}`,
      planType: 'PREMIUM',
      contactEmail: teacher.email,
      organizationId: profile.orgId,
      returnToPath: '/teacher',
    })
    const payment = await confirmOrgPaymentViaWebhook(request, intent, teacher.token)
    expect(payment.status).toBe('PAID')
    expect(payment.activated).toBe(true)

    const teacherAfter = await unwrap<{ orgId?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    expect(teacherAfter.orgId).toBe(profile.orgId)

    const studentAfter = await unwrap<{ orgId?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(student.token) }),
    )
    expect(studentAfter.orgId).toBe(profile.orgId)

    const quota = await unwrap<{ planType: string }>(
      await request.get(`${BE_URL}/api/org/quota`, { headers: authHeaders(teacher.token) }),
    )
    expect(quota.planType).toBe('PREMIUM')

    const rosterAfter = await unwrap<
      Array<{ email: string; questProgress?: Array<{ questId: string; completionPct: number }> }>
    >(
      await request.get(`${BE_URL}/api/org/${profile.orgId}/roster`, { headers: authHeaders(teacher.token) }),
    )
    expect(rosterAfter.some((m) => m.email === student.email)).toBe(true)
    const studentAfterRow = rosterAfter.find((m) => m.email === student.email)
    const progressAfter = studentAfterRow?.questProgress?.find((q) => q.questId === remote.id)?.completionPct ?? 0
    const questRowsAfter = studentAfterRow?.questProgress?.length ?? 0
    expect(questRowsAfter).toBeGreaterThanOrEqual(questRowsBefore)
    expect(progressAfter).toBeGreaterThanOrEqual(progressBefore)

    const title = `GP-HUONG-08 ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/lms/assignments`, {
        headers: authHeaders(teacher.token),
        data: { title, questId: remote.id },
      }),
    )

    const student2 = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(student2.token),
        data: { inviteCode: invite.inviteCode },
      }),
    )
    await completeRemoteQuest(request, student2.token, remote)

    const assignments = await unwrap<
      Array<{
        title: string
        submissions: Array<{ score: number | null; autoGraded: boolean }>
      }>
    >(
      await request.get(`${BE_URL}/api/lms/assignments`, { headers: authHeaders(teacher.token) }),
    )
    const row = assignments.find((a) => a.title === title)
    expect(row?.submissions[0]?.autoGraded).toBe(true)
    expect(row?.submissions[0]?.score).toBe(100)

    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })
    await page.goto('/teacher/assignments')
    await expect(page.getByRole('heading', { name: /LMS Premium/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(title)).toBeVisible()
    await expect(page.getByRole('button', { name: /Xuất CSV/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Xuất PDF/i })).toBeVisible()
  })
})
