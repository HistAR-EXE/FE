import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL, SEED } from '../helpers/constants'
import {
  completeRemoteQuest,
  createStandardOrgTeacher,
  ensureRemoteQuest,
} from '../helpers/monetization'
import { seedSession } from '../helpers/session'

test.describe('E2E · AC-M13 Standard teacher dashboard', () => {
  test('AC-M13-API: roster shows quest completion % after student completes quest', async ({
    request,
  }) => {
    const teacher = await createStandardOrgTeacher(request)
    const remote = await ensureRemoteQuest(request, SEED.cuChiLocationId)

    const profile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
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

    const roster = await unwrap<
      Array<{
        email: string
        questProgress?: Array<{ questId: string; title: string; completionPct: number }>
      }>
    >(
      await request.get(`${BE_URL}/api/org/${profile.orgId}/roster`, {
        headers: authHeaders(teacher.token),
      }),
    )
    const member = roster.find((m) => m.email === student.email)
    expect(member).toBeTruthy()
    expect(member!.questProgress?.length).toBeGreaterThan(0)
    const questRow = member!.questProgress?.find((q) => q.questId === remote.id)
    expect(questRow, `roster should track quest ${remote.id}`).toBeTruthy()
    expect(questRow!.completionPct).toBeGreaterThanOrEqual(100)
  })

  test('AC-M13-E2E: teacher dashboard shows roster and completion analytics', async ({
    page,
    request,
  }) => {
    const teacher = await createStandardOrgTeacher(request)
    const remote = await ensureRemoteQuest(request, SEED.cuChiLocationId)

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

    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })
    await page.goto('/teacher')
    await expect(page.getByRole('heading', { name: /Dashboard lớp học/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(student.email)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Hoàn thành quest|completion/i).first()).toBeVisible()
    await expect(page.getByText(/%/).first()).toBeVisible()
  })
})
