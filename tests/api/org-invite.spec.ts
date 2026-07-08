import { test, expect } from '@playwright/test'
import crypto from 'node:crypto'
import { BE_URL, DEMO_USER } from '../helpers/constants'
import { login, authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { setOrgInviteExpired } from '../helpers/monetization'

function signSepay(secret: string, timestamp: string, rawBody: string) {
  return `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`
}

test.describe('BE API · Org invite', () => {
  test('POST /api/org/join rejects invalid code', async ({ request }) => {
    const s = await login(request, DEMO_USER)
    const res = await request.post(`${BE_URL}/api/org/join`, {
      headers: authHeaders(s.token),
      data: { inviteCode: 'INVALID1' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('GET /api/profile/me includes org fields', async ({ request }) => {
    const s = await login(request, DEMO_USER)
    const res = await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(s.token) })
    const profile = await unwrap<{ orgId?: string | null; orgSubscription?: string }>(res)
    expect(profile).toHaveProperty('orgSubscription')
  })

  test('POST /api/org/invite returns invite code for current teacher org', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const subscribeRes = await request.post(`${BE_URL}/api/billing/org/subscribe`, {
      headers: authHeaders(teacher.token),
      data: {
        orgName: `THPT Contract ${Date.now()}`,
        planType: 'STANDARD',
        contactEmail: teacher.email,
      },
    })
    await unwrap(subscribeRes)

    const inviteRes = await request.post(`${BE_URL}/api/org/invite`, {
      headers: authHeaders(teacher.token),
    })
    const invite = await unwrap<{ inviteCode: string; inviteUrl: string }>(inviteRes)

    expect(invite.inviteCode).toHaveLength(6)
    expect(invite.inviteUrl).toMatch(/\/join\?code=/)
    expect(invite.inviteUrl).toMatch(/^https?:\/\//)
  })

  test('MON-B09: join rejects expired invite code (BR-M15)', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `Expire Invite ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )
    const orgProfile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    const hooked = await setOrgInviteExpired(request, orgProfile.orgId)
    test.skip(!hooked, 'HISTAR_TEST_HOOKS_ENABLED required for invite-expire test hook')

    const student = await registerFreshUser(request)
    const res = await request.post(`${BE_URL}/api/org/join`, {
      headers: authHeaders(student.token),
      data: { inviteCode: invite.inviteCode },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    const body = (await res.json()) as { message?: string }
    expect(body.message ?? '').toMatch(/hết hạn|không hợp lệ/i)
  })

  test('POST /api/org/{orgId}/invite-email sends for teacher org', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `Invite Email ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
      }),
    )
    const orgProfile = await unwrap<{ orgId: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(teacher.token) }),
    )
    const res = await request.post(`${BE_URL}/api/org/${orgProfile.orgId}/invite-email`, {
      headers: authHeaders(teacher.token),
      data: { studentEmail: `student_${Date.now()}@histar.vn`, studentName: 'E2E Student' },
    })
    await unwrap(res)
  })

  test('B2C history and cancel endpoints work for premium user', async ({ request }) => {
    const user = await registerFreshUser(request)
    const subscribeRes = await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
      headers: authHeaders(user.token),
      data: { paymentMethod: 'DEMO' },
    })
    await unwrap(subscribeRes)

    const historyRes = await request.get(`${BE_URL}/api/billing/b2c/history`, {
      headers: authHeaders(user.token),
    })
    const history = await unwrap<Array<{ isActive: boolean; paymentMethod: string }>>(historyRes)
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].paymentMethod).toBe('DEMO')

    const cancelRes = await request.delete(`${BE_URL}/api/billing/b2c/cancel`, {
      headers: authHeaders(user.token),
    })
    const cancelled = await unwrap<{ isActive: boolean }>(cancelRes)
    expect(cancelled.isActive).toBe(false)
  })

  test('B2C SePay payment intent and webhook upgrade flow works', async ({ request }) => {
    const user = await registerFreshUser(request)

    const createRes = await request.post(`${BE_URL}/api/billing/b2c/payment`, {
      headers: authHeaders(user.token),
      data: { returnToPath: '/settings' },
      failOnStatusCode: false,
    })
    if (createRes.status() >= 400) {
      test.skip(true, 'SePay chưa được enable/cấu hình trên backend local đang chạy')
      return
    }

    const intent = await unwrap<{ orderCode: string; transferContent: string; amountVnd: number }>(createRes)
    expect(intent.orderCode).toBeTruthy()
    expect(intent.transferContent).toBe(intent.orderCode)

    const timestamp = Math.floor(Date.now() / 1000).toString()
    const rawPayload = {
      id: Date.now(),
      gateway: 'Vietcombank',
      transactionDate: '2026-07-07 15:00:00',
      accountNumber: '0010000000355',
      subAccount: '',
      code: intent.orderCode,
      content: `${intent.orderCode} chuyen tien`,
      transferType: 'in',
      description: 'Test payment',
      transferAmount: intent.amountVnd,
      accumulated: 1000000,
      referenceCode: `FT${Date.now()}`,
    }
    const rawBody = JSON.stringify(rawPayload)

    const webhookRes = await request.post(`${BE_URL}/api/billing/webhooks/sepay`, {
      headers: {
        'Content-Type': 'application/json',
        'X-SePay-Timestamp': timestamp,
        'X-SePay-Signature': signSepay('whsec_d4bUZa4YPpiArwc3LluZarMQRCh4vQNV', timestamp, rawBody),
      },
      data: rawPayload,
    })
    await unwrap(webhookRes)

    const paymentStatusRes = await request.get(`${BE_URL}/api/billing/b2c/payment/${intent.orderCode}`, {
      headers: authHeaders(user.token),
    })
    const paymentStatus = await unwrap<{ status: string; upgraded: boolean }>(paymentStatusRes)
    expect(paymentStatus.status).toBe('PAID')
    expect(paymentStatus.upgraded).toBe(true)

    const billingStatusRes = await request.get(`${BE_URL}/api/billing/b2c/status`, {
      headers: authHeaders(user.token),
    })
    const billingStatus = await unwrap<{ tier: string; isActive: boolean }>(billingStatusRes)
    expect(billingStatus.tier).toBe('PREMIUM')
    expect(billingStatus.isActive).toBe(true)
  })

  test('B2B SePay payment intent and webhook activation flow works', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `THPT SePay ${Date.now()}`

    const createRes = await request.post(`${BE_URL}/api/billing/org/payment`, {
      headers: authHeaders(teacher.token),
      data: { orgName, planType: 'STANDARD', contactEmail: teacher.email, returnToPath: '/teacher' },
      failOnStatusCode: false,
    })
    if (createRes.status() >= 400) {
      test.skip(true, 'SePay chưa được enable/cấu hình trên backend local đang chạy')
      return
    }

    const intent = await unwrap<{ orderCode: string; transferContent: string; amountVnd: number }>(createRes)
    expect(intent.orderCode).toMatch(/^ORG/)
    expect(intent.transferContent).toBe(intent.orderCode)

    const timestamp = Math.floor(Date.now() / 1000).toString()
    const rawPayload = {
      id: Date.now(),
      gateway: 'MBBank',
      transactionDate: '2026-07-07 16:00:00',
      accountNumber: '0815330544',
      subAccount: '',
      code: intent.orderCode,
      content: `${intent.orderCode} org payment`,
      transferType: 'in',
      description: 'Test org payment',
      transferAmount: intent.amountVnd,
      accumulated: 1000000,
      referenceCode: `FTORG${Date.now()}`,
    }
    const rawBody = JSON.stringify(rawPayload)

    const webhookRes = await request.post(`${BE_URL}/api/billing/webhooks/sepay`, {
      headers: {
        'Content-Type': 'application/json',
        'X-SePay-Timestamp': timestamp,
        'X-SePay-Signature': signSepay('whsec_d4bUZa4YPpiArwc3LluZarMQRCh4vQNV', timestamp, rawBody),
      },
      data: rawPayload,
    })
    await unwrap(webhookRes)

    const paymentStatusRes = await request.get(`${BE_URL}/api/billing/org/payment/${intent.orderCode}`, {
      headers: authHeaders(teacher.token),
    })
    const paymentStatus = await unwrap<{ status: string; activated: boolean; organizationId: string | null }>(paymentStatusRes)
    expect(paymentStatus.status).toBe('PAID')
    expect(paymentStatus.activated).toBe(true)
    expect(paymentStatus.organizationId).toBeTruthy()

    const orgStatusRes = await request.get(`${BE_URL}/api/billing/org/status`, {
      headers: authHeaders(teacher.token),
    })
    const orgStatus = await unwrap<{ isActive: boolean; planType: string; orgName: string }>(orgStatusRes)
    expect(orgStatus.isActive).toBe(true)
    expect(orgStatus.planType).toBe('STANDARD')
    expect(orgStatus.orgName).toBe(orgName)
  })

  test('SePay webhook rejects invalid HMAC signature', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/billing/webhooks/sepay`, {
      headers: {
        'Content-Type': 'application/json',
        'X-SePay-Timestamp': Math.floor(Date.now() / 1000).toString(),
        'X-SePay-Signature': 'sha256=invalid',
      },
      data: { id: 1, code: 'INVALID', transferType: 'in' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('GET /api/org/quota includes reset date for org user', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const subscribeRes = await request.post(`${BE_URL}/api/billing/org/subscribe`, {
      headers: authHeaders(teacher.token),
      data: {
        orgName: `THPT Quota ${Date.now()}`,
        planType: 'MICRO',
        contactEmail: teacher.email,
      },
    })
    await unwrap(subscribeRes)

    const quotaRes = await request.get(`${BE_URL}/api/org/quota`, {
      headers: authHeaders(teacher.token),
    })
    const quota = await unwrap<{ quotaResetsOn: string; planType: string }>(quotaRes)
    expect(quota.planType).toBe('MICRO')
    expect(quota.quotaResetsOn).toBeTruthy()
  })
})
