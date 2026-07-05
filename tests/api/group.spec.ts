import { test, expect } from '@playwright/test'
import { BE_URL, DEMO_USER } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'

test.describe('BE API · Groups', () => {
  test('POST /api/groups creates group with code', async ({ request }) => {
    const s = await login(request, DEMO_USER)
    const res = await request.post(`${BE_URL}/api/groups`, {
      headers: authHeaders(s.token),
      data: { name: 'Playwright Test Group' },
    })
    expect(res.ok()).toBeTruthy()
    const data = await unwrap<{ code: string; name: string }>(res)
    expect(data.code).toHaveLength(6)
    expect(data.name).toBe('Playwright Test Group')
  })

  test('GET /api/groups/mine lists groups', async ({ request }) => {
    const s = await login(request, DEMO_USER)
    const res = await request.get(`${BE_URL}/api/groups/mine`, {
      headers: authHeaders(s.token),
    })
    expect(res.ok()).toBeTruthy()
    const list = await unwrap<unknown[]>(res)
    expect(Array.isArray(list)).toBeTruthy()
  })
})
