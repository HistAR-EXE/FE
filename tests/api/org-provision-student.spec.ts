import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, login, registerFreshUser, unwrap } from '../helpers/api'
import { expectApiError } from '../helpers/errors'

test.describe('BE API · Org student provision', () => {
  test('ORG-P01: teacher provisions student → login → premium via org', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: {
          orgName: `Provision Org ${Date.now()}`,
          planType: 'STANDARD',
          contactEmail: teacher.email,
        },
      }),
    )
    const orgProfile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    const orgId = orgProfile.orgId
    const studentEmail = `provision_${Date.now()}@histar.vn`

    const provisionRes = await request.post(`${BE_URL}/api/org/${orgId}/students/provision`, {
      headers: authHeaders(teacher.token),
      data: { email: studentEmail, displayName: 'Provision Student', sendCredentialsEmail: false },
    })
    const provision = await unwrap<{
      userId: string
      email: string
      accountCreated: boolean
      temporaryPassword: string
    }>(provisionRes)
    expect(provision.accountCreated).toBe(true)
    expect(provision.temporaryPassword).toBeTruthy()

    const rosterRes = await request.get(`${BE_URL}/api/org/${orgId}/roster`, {
      headers: authHeaders(teacher.token),
    })
    const roster = await unwrap<Array<{ email: string; orgRole: string }>>(rosterRes)
    expect(roster.some((m) => m.email === studentEmail && m.orgRole === 'student')).toBe(true)

    const studentSession = await login(request, {
      email: studentEmail,
      password: provision.temporaryPassword,
    })
    const profileRes = await request.get(`${BE_URL}/api/profile/me`, {
      headers: authHeaders(studentSession.token),
    })
    const profile = await unwrap<{ orgId: string; orgSubscription: string }>(profileRes)
    expect(profile.orgId).toBe(orgId)
    expect(profile.orgSubscription).not.toBe('NONE')
  })

  test('ORG-P02: reprovision existing email joins org without creating duplicate', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: {
          orgName: `Reprovision ${Date.now()}`,
          planType: 'STANDARD',
          contactEmail: teacher.email,
        },
      }),
    )
    const orgProfile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    const orgId = orgProfile.orgId
    const existingStudent = await registerFreshUser(request)
    const email = existingStudent.email

    const first = await unwrap<{ accountCreated: boolean }>(
      await request.post(`${BE_URL}/api/org/${orgId}/students/provision`, {
        headers: authHeaders(teacher.token),
        data: { email, sendCredentialsEmail: false },
      }),
    )
    expect(first.accountCreated).toBe(false)

    const second = await unwrap<{ accountCreated: boolean }>(
      await request.post(`${BE_URL}/api/org/${orgId}/students/provision`, {
        headers: authHeaders(teacher.token),
        data: { email, sendCredentialsEmail: false },
      }),
    )
    expect(second.accountCreated).toBe(false)

    const roster = await unwrap<Array<{ email: string }>>(
      await request.get(`${BE_URL}/api/org/${orgId}/roster`, { headers: authHeaders(teacher.token) }),
    )
    expect(roster.filter((m) => m.email === email)).toHaveLength(1)
  })

  test('ORG-P04: provision fails when email belongs to another org', async ({ request }) => {
    const teacherA = await registerFreshUser(request)
    const teacherB = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacherA.token),
        data: { orgName: `Org A ${Date.now()}`, planType: 'STANDARD', contactEmail: teacherA.email },
      }),
    )
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacherB.token),
        data: { orgName: `Org B ${Date.now()}`, planType: 'STANDARD', contactEmail: teacherB.email },
      }),
    )
    const orgA = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacherA.token) }),
    )
    const orgB = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacherB.token) }),
    )
    const student = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(student.token),
        data: {
          inviteCode: (
            await unwrap<{ inviteCode: string }>(
              await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacherB.token) }),
            )
          ).inviteCode,
        },
      }),
    )

    const res = await request.post(`${BE_URL}/api/org/${orgA.orgId}/students/provision`, {
      headers: authHeaders(teacherA.token),
      data: { email: student.email, sendCredentialsEmail: false },
      failOnStatusCode: false,
    })
    await expectApiError(res, 422)
  })

  test('FLOW-B02: student member cannot provision accounts', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName: `Student Gate ${Date.now()}`, planType: 'STANDARD', contactEmail: teacher.email },
      }),
    )
    const orgId = (
      await unwrap<{ orgId: string }>(
        await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
      )
    ).orgId
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

    const res = await request.post(`${BE_URL}/api/org/${orgId}/students/provision`, {
      headers: authHeaders(student.token),
      data: { email: `blocked_${Date.now()}@histar.vn`, sendCredentialsEmail: false },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})
