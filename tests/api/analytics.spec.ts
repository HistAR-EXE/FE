import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders } from '../helpers/api'

/**
 * Tầng 1 · ANALYTICS EVENTS (BR-19) — hành vi trong phiên phải ghi được.
 */
test.describe('BE API · Analytics events', () => {
  test('BR-19: POST /api/me/analytics/events chấp nhận event hợp lệ', async ({ request }) => {
    const s = await login(request)
    const res = await request.post(`${BE_URL}/api/me/analytics/events`, {
      headers: authHeaders(s.token),
      data: {
        eventType: 'ARTIFACT_VIEWED',
        locationId: SEED.cuChiLocationId,
        eventKey: 'e2e-artifact',
        source: 'e2e',
      },
      failOnStatusCode: false,
    })
    expect([200, 201, 202, 204], `analytics status: ${res.status()}`).toContain(res.status())
  })

  test('BR-19: analytics events yêu cầu JWT', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/me/analytics/events`, {
      data: { eventType: 'TOUR_SCENE_VIEWED', locationId: SEED.cuChiLocationId },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(401)
  })
})
