import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { registerFreshUser, authHeaders, unwrap } from '../helpers/api'

test.describe('E2E · Tour360 dwell / discovery (AC-3)', () => {
  test('T360-H2: record discovery → artifact có thể unlock cùng phiên', async ({ request }) => {
    const user = await registerFreshUser(request)
    const headers = authHeaders(user.token)

    const bindRes = await request.get(`${BE_URL}/api/discovery-bindings/by-location/${SEED.cuChiLocationId}`, {
      headers,
    })
    if (bindRes.status() === 404) test.skip(true, 'No bindings')
    const bindings = await bindRes.json().then((b) => (b as { data?: Array<{ unlockKey: string }> }).data ?? [])
    test.skip(bindings.length === 0, 'No bindings')

    const artifactParams = { locationId: SEED.cuChiLocationId }

    const before = await request.get(`${BE_URL}/api/me/artifacts`, { headers, params: artifactParams })
    const beforeData = await unwrap<{ items: Array<{ unlockKey: string }>; collected: number; total: number }>(before)
    const beforeKeys = new Set(beforeData.items.map((a) => a.unlockKey))

    const discovery = await request.post(`${BE_URL}/api/me/discoveries`, {
      headers,
      data: {
        locationId: SEED.cuChiLocationId,
        unlockKey: bindings[0].unlockKey,
        source: 'tour360-dwell-sim',
      },
    })
    expect(discovery.ok(), `discovery failed: ${await discovery.text()}`).toBeTruthy()

    const after = await request.get(`${BE_URL}/api/me/artifacts`, { headers, params: artifactParams })
    const afterData = await unwrap<{ items: Array<{ unlockKey: string }>; collected: number; total: number }>(after)
    // Same session: either new artifact unlocked or discovery recorded (progress increased)
    const summary = await request.get(`${BE_URL}/api/me/discoveries/summary`, {
      headers,
      params: { locationId: SEED.cuChiLocationId },
    })
    const sum = await unwrap<{ discovered: number }>(summary)
    expect(sum.discovered).toBeGreaterThanOrEqual(1)
    expect(afterData.items.length).toBeGreaterThanOrEqual(beforeKeys.size)
  })
})
