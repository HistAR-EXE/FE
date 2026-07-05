import { test, expect } from '@playwright/test'
import { BE_URL, DEMO_USER } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'

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
})
