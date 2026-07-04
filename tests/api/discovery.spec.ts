import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap, registerFreshUser } from '../helpers/api'
import { expectStatus } from '../helpers/errors'

/**
 * Tầng 1 · LUỒNG 3/6/7 (Discovery, Artifact, Check-in) — BR-06, BR-08, BR-09, C-05.
 */
test.describe('BE API · Discovery & Artifact', () => {
  test('BR-08 / C-05: POST /api/me/artifacts/unlock đã disabled (không trả 2xx)', async ({ request }) => {
    const s = await login(request)
    const res = await request.post(`${BE_URL}/api/me/artifacts/unlock`, {
      headers: authHeaders(s.token),
      data: {},
      failOnStatusCode: false,
    })
    expect(res.ok(), 'đường C phải bị vô hiệu hoá — không được trả thành công').toBeFalsy()
    expect([400, 401, 403, 405, 410, 500]).toContain(res.status())
  })

  test('LUỒNG 2: /api/me/discoveries/visited-locations trả danh sách + count', async ({ request }) => {
    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/me/discoveries/visited-locations`, {
      headers: authHeaders(s.token),
    })
    const data = await unwrap<{ visitedLocationIds: string[]; visitedCount: number }>(res)
    expect(Array.isArray(data.visitedLocationIds)).toBeTruthy()
    expect(data.visitedCount).toBe(data.visitedLocationIds.length)
  })

  test('LUỒNG 11: discoveries/summary theo location trả tiến độ', async ({ request }) => {
    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/me/discoveries/summary`, {
      headers: authHeaders(s.token),
      params: { locationId: SEED.cuChiLocationId },
    })
    const data = await unwrap<{ discovered: number; total: number; keys: string[] }>(res)
    expect(typeof data.discovered).toBe('number')
    expect(typeof data.total).toBe('number')
    expect(Array.isArray(data.keys)).toBeTruthy()
  })

  test('BR-09: discovery-bindings/by-location là API động (JWT)', async ({ request }) => {
    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/discovery-bindings/by-location/${SEED.cuChiLocationId}`, {
      headers: authHeaders(s.token),
      failOnStatusCode: false,
    })
    // Endpoint tồn tại (không 404) — nguồn sự thật động thay cho hardcode
    expect(res.status(), 'discovery-bindings phải tồn tại ở BE').not.toBe(404)
  })

  test('DSC-H4: POST valid discovery unlockKey', async ({ request }) => {
    const user = await registerFreshUser(request)
    const bindRes = await request.get(`${BE_URL}/api/discovery-bindings/by-location/${SEED.cuChiLocationId}`, {
      headers: authHeaders(user.token),
    })
    if (bindRes.status() === 404) {
      test.skip(true, 'No discovery bindings endpoint')
    }
    const keys = await bindRes.json().then((b) => (b as { data?: Array<{ unlockKey: string }> }).data ?? [])
    test.skip(keys.length === 0, 'No bindings for Củ Chi')
    const res = await request.post(`${BE_URL}/api/me/discoveries`, {
      headers: authHeaders(user.token),
      data: { locationId: SEED.cuChiLocationId, unlockKey: keys[0].unlockKey, source: 'e2e-test' },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('DSC-B1: invalid unlockKey → 4xx', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.post(`${BE_URL}/api/me/discoveries`, {
      headers: authHeaders(user.token),
      data: { locationId: SEED.cuChiLocationId, unlockKey: 'invalid:does-not-exist', source: 'e2e-test' },
      failOnStatusCode: false,
    })
    expect(res.ok()).toBeFalsy()
    expect([400, 404, 422]).toContain(res.status())
  })
})
