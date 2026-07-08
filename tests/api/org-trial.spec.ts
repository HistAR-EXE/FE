import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import { BE_URL, SEED } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'

function forceTrialExpired(orgId: string) {
  const sql = `UPDATE organizations SET status = 'TRIAL_EXPIRED', plan_end_date = CURRENT_DATE - INTERVAL '1 day' WHERE id = '${orgId}';`
  execSync(`docker exec histar-postgres psql -U timelens -d timelens -c "${sql}"`, { stdio: 'pipe' })
}

test.describe('BE API · Classroom trial', () => {
  test('TRIAL-H01: teacher can create STANDARD classroom trial 14 days', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const status = await unwrap<{
      planType: string
      maxVerifiedAccounts: number
      isActive: boolean
      daysUntilExpiry: number
    }>(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Trial Class ${Date.now()}`, contactEmail: teacher.email },
      }),
    )
    expect(status.planType).toBe('STANDARD')
    expect(status.maxVerifiedAccounts).toBe(11)
    expect(status.isActive).toBe(true)
    expect(status.daysUntilExpiry).toBeLessThanOrEqual(14)
    expect(status.daysUntilExpiry).toBeGreaterThanOrEqual(0)
  })

  test('TRIAL-B01: teacher cannot create second trial', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Trial Once ${Date.now()}`, contactEmail: teacher.email },
      }),
    )
    const second = await request.post(`${BE_URL}/api/billing/org/trial`, {
      headers: authHeaders(teacher.token),
      data: { orgName: `Trial Twice ${Date.now()}`, contactEmail: teacher.email },
      failOnStatusCode: false,
    })
    expect(second.status()).toBe(422)
  })

  test('TRIAL-B02: trial seat cap allows 10 students, blocks 11th', async ({ request }) => {
    // Bulk register + verify MUST use test-hook path (see helpers/api verifyUserEmail) — no SMTP.
    test.setTimeout(180_000)
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Trial Seats ${Date.now()}`, contactEmail: teacher.email },
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )
    for (let i = 0; i < 10; i += 1) {
      const student = await registerFreshUser(request)
      await unwrap(
        await request.post(`${BE_URL}/api/org/join`, {
          headers: authHeaders(student.token),
          data: { inviteCode: invite.inviteCode },
        }),
      )
    }
    const student11 = await registerFreshUser(request)
    const blocked = await request.post(`${BE_URL}/api/org/join`, {
      headers: authHeaders(student11.token),
      data: { inviteCode: invite.inviteCode },
      failOnStatusCode: false,
    })
    expect(blocked.status()).toBe(422)
  })

  test('TRIAL-B03: trial expired student cannot continue quest and invite disabled', async ({ request }) => {
    test.skip(
      process.env.CI === 'true' && !process.env.HISTAR_DOCKER_POSTGRES,
      'Requires docker postgres histar-postgres for trial-expiry patch',
    )

    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Trial Expire ${Date.now()}`, contactEmail: teacher.email },
      }),
    )
    const profile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    try {
      forceTrialExpired(profile.orgId)
    } catch {
      test.skip(true, 'docker exec histar-postgres unavailable — skip trial expiry API test')
    }

    const inviteCreate = await request.post(`${BE_URL}/api/org/invite`, {
      headers: authHeaders(teacher.token),
      failOnStatusCode: false,
    })
    expect(inviteCreate.status()).toBe(422)

    const student = await registerFreshUser(request)
    const joinBlocked = await request.post(`${BE_URL}/api/org/join`, {
      headers: authHeaders(student.token),
      data: { inviteCode: 'ABC123' },
      failOnStatusCode: false,
    })
    expect(joinBlocked.status()).toBeGreaterThanOrEqual(400)

    const member = await registerFreshUser(request)
    // add member before expiration by direct org join with fresh active trial
    const teacher2 = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher2.token),
        data: { orgName: `Trial Member ${Date.now()}`, contactEmail: teacher2.email },
      }),
    )
    const invite2 = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher2.token) }),
    )
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(member.token),
        data: { inviteCode: invite2.inviteCode },
      }),
    )
    const profile2 = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher2.token) }),
    )
    try {
      forceTrialExpired(profile2.orgId)
    } catch {
      test.skip(true, 'docker exec histar-postgres unavailable — skip TRIAL_EXPIRED quest gate check')
    }
    const startBlocked = await request.post(`${BE_URL}/api/quests/${SEED.onsiteQuestId}/start`, {
      headers: authHeaders(member.token),
      failOnStatusCode: false,
    })
    expect(startBlocked.status()).toBe(403)
    const body = (await startBlocked.json()) as { code?: string }
    expect(body.code).toBe('TRIAL_EXPIRED')
  })

  test('TRIAL-H02: expired trial student can still read global leaderboard in read-only mode', async ({ request }) => {
    test.skip(
      process.env.CI === 'true' && !process.env.HISTAR_DOCKER_POSTGRES,
      'Requires docker postgres histar-postgres for trial-expiry patch',
    )

    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/trial`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Trial Leaderboard ${Date.now()}`, contactEmail: teacher.email },
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

    const teacherProfile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    try {
      forceTrialExpired(teacherProfile.orgId)
    } catch {
      test.skip(true, 'docker exec histar-postgres unavailable — skip expired leaderboard API test')
    }

    const leaderboard = await request.get(`${BE_URL}/api/leaderboard?scope=all`, {
      headers: authHeaders(student.token),
      failOnStatusCode: false,
    })
    expect(leaderboard.status()).toBe(200)
    const payload = await unwrap<{ scope: string; entries: Array<{ rank: number }> }>(leaderboard)
    expect(payload.scope).toBe('all')
    expect(Array.isArray(payload.entries)).toBeTruthy()
  })
})
