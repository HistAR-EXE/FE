import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import { getCuChiCharacterId, sendChatMessage, setOrgQuotaUsed } from '../helpers/monetization'
import { expectStatus } from '../helpers/errors'

test.describe('BE API · Org monthly quota (GP-MON-04-API)', () => {
  test('GP-MON-04-API: org MICRO student blocked when monthly pool exhausted via test hook', async ({
    request,
  }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `Micro Quota Hook ${Date.now()}`
    const status = await unwrap<{ organizationId?: string }>(
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

    const profile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(student.token) }),
    )
    const orgId = status.organizationId ?? profile.orgId
    const quota = await unwrap<{ aiQueriesLimit?: number | null; maxAiQueriesPerMonth?: number }>(
      await request.get(`${BE_URL}/api/org/quota`, { headers: authHeaders(student.token) }),
    )
    const limit = quota.aiQueriesLimit ?? quota.maxAiQueriesPerMonth ?? 5000

    const hooked = await setOrgQuotaUsed(request, orgId, limit)
    test.skip(!hooked, 'HISTAR_TEST_HOOKS_ENABLED not set on BE — enable in BE/.env')

    const characterId = await getCuChiCharacterId(request)
    const res = await sendChatMessage(request, student.token, characterId, 'Org quota exceeded hook test')
    await expectStatus(res, 403)
    const body = (await res.json()) as { code?: string; quotaType?: string }
    expect(body.code).toBe('QUOTA_EXCEEDED')
  })
})
