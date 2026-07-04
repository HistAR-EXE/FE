import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { BE_URL, DEMO_USER, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'

test.describe('BE API · Admin era (BR-24)', () => {
  test('ADM-H1: era-count Củ Chi sufficient=true', async ({ request }) => {
    const s = await login(request, DEMO_USER)
    const res = await request.get(`${BE_URL}/api/admin/locations/${SEED.cuChiLocationId}/era-count`, {
      headers: authHeaders(s.token),
    })
    const data = await unwrap<{ eraCount: number; sufficient: boolean }>(res)
    expect(data.eraCount).toBeGreaterThanOrEqual(3)
    expect(data.sufficient).toBe(true)
  })

  test('ADM-B1: create quest tại location thiếu era → 4xx', async ({ request }) => {
    const s = await login(request, DEMO_USER)
    const sparseLocationId = randomUUID()
    const res = await request.post(`${BE_URL}/api/admin/quests`, {
      headers: authHeaders(s.token),
      data: {
        locationId: sparseLocationId,
        title: 'E2E Should Fail Era',
        description: 'test',
        pointsReward: 10,
        requireOnsiteCheckin: false,
        stepsTotal: 1,
        stepDiscoveryKeys: 'key:test',
      },
      failOnStatusCode: false,
    })
    expect(res.ok()).toBeFalsy()
    expect([400, 422]).toContain(res.status())
  })
})
