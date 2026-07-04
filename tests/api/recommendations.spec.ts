import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'
import { expectStatus } from '../helpers/errors'

test.describe('BE API · Recommendations', () => {
  test('REC-H1: GET recommendations for location', async ({ request }) => {
    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/me/recommendations`, {
      headers: authHeaders(s.token),
      params: { locationId: SEED.cuChiLocationId },
    })
    const data = await unwrap<{ items: unknown[] }>(res)
    expect(Array.isArray(data.items)).toBeTruthy()
  })

  test('REC-B1: no JWT → 401', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/me/recommendations`, {
      params: { locationId: SEED.cuChiLocationId },
      failOnStatusCode: false,
    })
    await expectStatus(res, 401)
  })
})
