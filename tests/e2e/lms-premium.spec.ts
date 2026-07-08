import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import {
  completeRemoteQuest,
  createPremiumOrgTeacher,
  createStandardOrgTeacher,
  ensureRemoteQuest,
} from '../helpers/monetization'
import { expectStatus } from '../helpers/errors'
import { seedSession } from '../helpers/session'

test.describe('BE API · LMS Premium (LMS-B01/H01/H02)', () => {
  test('LMS-B01: STANDARD teacher cannot create assignment', async ({ request }) => {
    const teacher = await createStandardOrgTeacher(request)
    const res = await request.post(`${BE_URL}/api/lms/assignments`, {
      headers: authHeaders(teacher.token),
      data: { title: 'Bài tập test', questId: '33333333-3333-3333-3333-333333333333' },
      failOnStatusCode: false,
    })
    await expectStatus(res, 422)
    const body = (await res.json()) as { message?: string }
    expect(body.message ?? '').toMatch(/Premium/i)
  })

  test('LMS-H01: PREMIUM org teacher creates and lists assignment', async ({ request }) => {
    const teacher = await createPremiumOrgTeacher(request)
    const remote = await ensureRemoteQuest(request)

    const created = await unwrap<{ id: string; title: string }>(
      await request.post(`${BE_URL}/api/lms/assignments`, {
        headers: authHeaders(teacher.token),
        data: { title: `LMS E2E ${Date.now()}`, questId: remote.id },
      }),
    )
    expect(created.title).toMatch(/LMS E2E/)

    const list = await unwrap<Array<{ id: string; title: string }>>(
      await request.get(`${BE_URL}/api/lms/assignments`, { headers: authHeaders(teacher.token) }),
    )
    expect(list.some((a) => a.id === created.id)).toBeTruthy()
  })

  test('LMS-H02: quest completion auto-grades assignment submission', async ({ request }) => {
    const teacher = await createPremiumOrgTeacher(request)
    const remote = await ensureRemoteQuest(request)

    const title = `Auto-grade ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/lms/assignments`, {
        headers: authHeaders(teacher.token),
        data: { title, questId: remote.id },
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
    await completeRemoteQuest(request, student.token, remote)

    const list = await unwrap<
      Array<{
        title: string
        submissions: Array<{ score: number | null; autoGraded: boolean }>
      }>
    >(
      await request.get(`${BE_URL}/api/lms/assignments`, { headers: authHeaders(teacher.token) }),
    )
    const assignment = list.find((a) => a.title === title)
    expect(assignment).toBeTruthy()
    expect(assignment!.submissions.length).toBeGreaterThan(0)
    expect(assignment!.submissions[0].autoGraded).toBe(true)
    expect(assignment!.submissions[0].score).toBe(100)
  })
})

test.describe('E2E · GP-HUONG-07 LMS Premium', () => {
  test('GP-HUONG-07: Premium teacher creates assignment and sees export buttons', async ({
    page,
    request,
  }) => {
    const teacher = await createPremiumOrgTeacher(request)
    const remote = await ensureRemoteQuest(request)

    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })
    await page.goto('/teacher/assignments')
    await expect(page.getByRole('heading', { name: /LMS Premium/i })).toBeVisible({ timeout: 15_000 })

    const title = `GP-HUONG-07 ${Date.now()}`
    await page.getByPlaceholder('Tiêu đề bài').fill(title)
    await page.getByPlaceholder('Quest UUID').fill(remote.id)
    await page.getByRole('button', { name: 'Giao bài' }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Xuất CSV/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Xuất PDF/i })).toBeVisible()
  })

  test('AC-M14-E2E: Premium teacher dashboard links to LMS and export', async ({ page, request }) => {
    const teacher = await createPremiumOrgTeacher(request)
    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })

    await page.goto('/teacher')
    await expect(page.getByRole('heading', { name: /Dashboard lớp học/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('link', { name: /LMS Premium/i })).toBeVisible()
    await page.getByRole('link', { name: /LMS Premium/i }).click()
    await expect(page).toHaveURL(/\/teacher\/assignments/)
    await expect(page.getByRole('heading', { name: /LMS Premium/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Xuất CSV/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Xuất PDF/i })).toBeVisible()
    await expect(page.getByText(/Giao bài quest, auto-chấm/i)).toBeVisible()
  })
})
