import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL, SEED } from '../helpers/constants'
import { ensureRemoteQuest, setOrgTrialExpired } from '../helpers/monetization'
import { seedSession } from '../helpers/session'

test.describe('E2E · Trial expire mid-action toast (CAP-TIME-01)', () => {
  test('TIME-E2E-01: quest start after trial expired shows hết hạn toast', async ({
    page,
    request,
  }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Trial UI Mid ${Date.now()}`, contactEmail: teacher.email },
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
    const profile = await unwrap<{ orgId: string; orgSubscription?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(student.token) }),
    )

    const hooked = await setOrgTrialExpired(request, profile.orgId)
    test.skip(!hooked, 'Test hooks disabled')

    const quest = await ensureRemoteQuest(request, SEED.benNhaRongLocationId)
    await seedSession(
      page,
      { ...student, orgId: profile.orgId, orgSubscription: profile.orgSubscription ?? 'STANDARD' },
      { mode: 'online' },
    )

    await page.goto(`/quests/${quest.id}`)
    await page.getByRole('button', { name: 'Nhận nhiệm vụ' }).first().click()
    await expect(page.getByText(/hết hạn|dùng thử/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
