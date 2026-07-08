import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'

async function subscribeStandardOrg(request: import('@playwright/test').APIRequestContext, token: string, email: string) {
  await unwrap(
    await request.post(`${BE_URL}/api/billing/org/subscribe`, {
      headers: authHeaders(token),
      data: { orgName: `Group Test ${Date.now()}`, planType: 'STANDARD', contactEmail: email },
    }),
  )
}

test.describe('BE API · Groups', () => {
  test('POST /api/groups creates group with code', async ({ request }) => {
    const user = await registerFreshUser(request)
    await subscribeStandardOrg(request, user.token, user.email)
    const res = await request.post(`${BE_URL}/api/groups`, {
      headers: authHeaders(user.token),
      data: { name: 'Playwright Test Group' },
    })
    expect(res.ok()).toBeTruthy()
    const data = await unwrap<{ code: string; name: string }>(res)
    expect(data.code).toHaveLength(6)
    expect(data.name).toBe('Playwright Test Group')
  })

  test('GET /api/groups/mine lists groups', async ({ request }) => {
    const user = await registerFreshUser(request)
    await subscribeStandardOrg(request, user.token, user.email)
    const res = await request.get(`${BE_URL}/api/groups/mine`, {
      headers: authHeaders(user.token),
    })
    expect(res.ok()).toBeTruthy()
    const list = await unwrap<unknown[]>(res)
    expect(Array.isArray(list)).toBeTruthy()
  })
})
