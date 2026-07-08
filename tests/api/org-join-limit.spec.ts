import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import { BE_URL } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { expectStatus } from '../helpers/errors'

function setOrgMaxAccounts(orgId: string, maxAccounts: number) {
  const sql = `UPDATE organizations SET max_verified_accounts = ${maxAccounts} WHERE id = '${orgId}';`
  execSync(
    `docker exec histar-postgres psql -U timelens -d timelens -c "${sql}"`,
    { stdio: 'pipe' },
  )
}

test.describe('BE API · Org join account limit', () => {
  test('MON-B07 / AC-M16: join rejected when org at max verified accounts', async ({ request }) => {
    test.skip(
      process.env.CI === 'true' && !process.env.HISTAR_DOCKER_POSTGRES,
      'Requires docker postgres histar-postgres for account cap patch',
    )

    const teacher = await registerFreshUser(request)
    const orgName = `Cap Test ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'MICRO', contactEmail: teacher.email },
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )
    const teacherProfile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    expect(teacherProfile.orgId).toBeTruthy()

    const studentA = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(studentA.token),
        data: { inviteCode: invite.inviteCode },
      }),
    )

    try {
      setOrgMaxAccounts(teacherProfile.orgId, 2)
    } catch {
      test.skip(true, 'docker exec histar-postgres unavailable — skip AC-M16 API test')
    }

    const studentB = await registerFreshUser(request)
    const blocked = await request.post(`${BE_URL}/api/org/join`, {
      headers: authHeaders(studentB.token),
      data: { inviteCode: invite.inviteCode },
      failOnStatusCode: false,
    })
    await expectStatus(blocked, 422)
    const body = (await blocked.json()) as { message?: string }
    expect(body.message ?? '').toMatch(/giới hạn|đầy|nâng gói/i)
  })
})
