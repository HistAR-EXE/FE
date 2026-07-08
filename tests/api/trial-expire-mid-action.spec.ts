import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { setOrgTrialExpired } from '../helpers/monetization'

test.describe('BE API · Trial expire mid-action (CAP-TIME-01)', () => {
  test('TIME-01: expire trial via test hook blocks student quest write with TRIAL_EXPIRED', async ({
    request,
  }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Trial Mid ${Date.now()}`, contactEmail: teacher.email },
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
    const profile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(student.token) }),
    )

    const hooked = await setOrgTrialExpired(request, profile.orgId)
    test.skip(!hooked, 'Test hooks disabled — POST /api/test/org/{id}/expire-trial unavailable')

    const questId = SEED.onsiteQuestId
    const blocked = await request.post(`${BE_URL}/api/quests/${questId}/start`, {
      headers: authHeaders(student.token),
      failOnStatusCode: false,
    })
    expect(blocked.status()).toBe(403)
    const body = (await blocked.json()) as { code?: string }
    expect(body.code).toBe('TRIAL_EXPIRED')
  })
})
