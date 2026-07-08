import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, registerFreshUser, authHeaders, unwrap } from '../helpers/api'
import { expectApiError, expectStatus } from '../helpers/errors'

test.describe('BE API · Check-in', () => {
  test('CHK-H1: GPS trong bán kính → success', async ({ request }) => {
    const user = await registerFreshUser(request)
    await request.post(`${BE_URL}/api/quests/${SEED.onsiteQuestId}/start`, {
      headers: authHeaders(user.token),
    })
    const res = await request.post(`${BE_URL}/api/checkins`, {
      headers: authHeaders(user.token),
      data: {
        locationId: SEED.cuChiLocationId,
        latitude: 11.141591,
        longitude: 106.4615963,
        qrCode: `timelens:location:${SEED.cuChiLocationId}`,
      },
    })
    const result = await unwrap<{ success?: boolean }>(res)
    expect(result.success ?? true).toBeTruthy()
  })

  test('CHK-B1: GPS quá xa → 4xx', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.post(`${BE_URL}/api/checkins`, {
      headers: authHeaders(user.token),
      data: {
        locationId: SEED.cuChiLocationId,
        latitude: 21.0,
        longitude: 105.0,
        qrCode: `timelens:location:${SEED.cuChiLocationId}`,
      },
      failOnStatusCode: false,
    })
    expect(res.ok()).toBeFalsy()
    expect([400, 422]).toContain(res.status())
  })

  test('CHK-B3: thiếu JWT → 401', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/checkins`, {
      data: {
        locationId: SEED.cuChiLocationId,
        latitude: 11.141591,
        longitude: 106.4615963,
        qrCode: `timelens:location:${SEED.cuChiLocationId}`,
      },
      failOnStatusCode: false,
    })
    await expectStatus(res, 401)
  })
})
