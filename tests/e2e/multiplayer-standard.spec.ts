import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL, SEED } from '../helpers/constants'
import { createStandardOrgTeacher } from '../helpers/monetization'
import { seedSession } from '../helpers/session'

test.describe('E2E · Multiplayer Standard happy path', () => {
  test('MP-H01: STANDARD org teacher creates group without paywall', async ({ page, request }) => {
    const teacher = await createStandardOrgTeacher(request)
    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })
    await page.goto('/groups')
    await page.getByPlaceholder('Tên nhóm / lớp').fill(`Lớp Standard ${Date.now()}`)
    await page.getByRole('button', { name: 'Tạo & nhận mã' }).click()
    await expect(page.getByRole('heading', { name: /Team-based Quest Room/i })).toHaveCount(0)
    await expect(page.getByText(/Đã tạo nhóm/i)).toBeVisible({ timeout: 15_000 })
  })

  test('MP-E2E-JOIN: student joins teacher quest room via /groups code', async ({ page, request }) => {
    const teacher = await createStandardOrgTeacher(request)
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

    const group = await unwrap<{ code: string; name: string }>(
      await request.post(`${BE_URL}/api/groups`, {
        headers: authHeaders(teacher.token),
        data: { name: `Quest Room ${Date.now()}` },
      }),
    )

    await seedSession(page, student, { mode: 'online' })
    await page.goto('/groups')
    await page.getByPlaceholder('Mã 6 ký tự').fill(group.code)
    await page.getByRole('button', { name: 'Tham gia' }).click()
    await expect(page.getByText(/Đã tham gia nhóm/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(group.name)).toBeVisible()
  })
})

test.describe('BE API · Multiplayer Standard', () => {
  test('MP-H02: STANDARD student has multiplayer access', async ({ request }) => {
    const teacher = await createStandardOrgTeacher(request)
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
    const access = await unwrap<boolean>(
      await request.get(`${BE_URL}/api/groups/multiplayer-access`, {
        headers: authHeaders(student.token),
      }),
    )
    expect(access).toBe(true)
  })

  test('MP-H03: STANDARD teacher can assign quest to group', async ({ request }) => {
    const teacher = await createStandardOrgTeacher(request)
    const group = await unwrap<{ id: string }>(
      await request.post(`${BE_URL}/api/groups`, {
        headers: authHeaders(teacher.token),
        data: { name: `MP Group ${Date.now()}` },
      }),
    )
    const res = await request.post(`${BE_URL}/api/groups/${group.id}/assign-quest`, {
      headers: authHeaders(teacher.token),
      data: { questId: SEED.onsiteQuestId },
      failOnStatusCode: false,
    })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})
