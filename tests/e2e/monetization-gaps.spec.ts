import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('Monetization gap coverage', () => {
  test('MON-H10: org member unlocks Time Portal era 1948', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `Era Unlock ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
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

    await seedSession(page, student, { mode: 'online' })
    await page.goto(`/time-portal/${SEED.cuChiLocationId}`)
    await page.getByRole('button', { name: '1948' }).click()
    await expect(page.getByRole('link', { name: /Nâng cấp Premium/i })).toHaveCount(0)
  })

  test('MON-H14: MICRO org sees multiplayer locked on groups', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: {
          orgName: `Micro Groups ${Date.now()}`,
          planType: 'MICRO',
          contactEmail: teacher.email,
        },
      }),
    )
    await seedSession(page, teacher, { mode: 'online' })
    await page.goto('/groups')
    await page.getByPlaceholder('Tên nhóm / lớp').fill('Lớp test MICRO')
    await page.getByRole('button', { name: 'Tạo & nhận mã' }).click()
    await expect(page.getByRole('heading', { name: /Team-based Quest Room/i })).toBeVisible({ timeout: 10_000 })
  })
})
