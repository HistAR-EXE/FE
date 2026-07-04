import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'
import { expectStatus } from '../helpers/errors'

test.describe('BE API · Visit session', () => {
  test('VIS-H1: start + end session', async ({ request }) => {
    const s = await login(request)
    const start = await request.post(`${BE_URL}/api/me/visit-sessions/start`, {
      headers: authHeaders(s.token),
      data: { locationId: SEED.cuChiLocationId, mode: 'online' },
    })
    const session = await unwrap<{ id: string; locationId: string; mode: string }>(start)
    expect(session.id).toBeTruthy()
    expect(session.mode).toBe('online')

    const end = await request.patch(`${BE_URL}/api/me/visit-sessions/${session.id}/end`, {
      headers: authHeaders(s.token),
      data: { reason: 'USER_EXIT' },
    })
    expect(end.ok()).toBeTruthy()
  })

  test('VIS-B1: start without JWT → 401', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/me/visit-sessions/start`, {
      data: { locationId: SEED.cuChiLocationId, mode: 'online' },
      failOnStatusCode: false,
    })
    await expectStatus(res, 401)
  })
})
