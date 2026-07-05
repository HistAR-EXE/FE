import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { BE_URL, ADMIN_USER, DEMO_USER } from '../helpers/constants'
import { login, registerFreshUser, authHeaders, unwrap } from '../helpers/api'

test.describe('BE API · Admin session replay (Gap 1)', () => {
  test('REPLAY-B3: guest → 401', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/admin/analytics/sessions/${randomUUID()}/replay`, {
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(401)
  })

  test('REPLAY-B1: USER JWT → 403', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.get(`${BE_URL}/api/admin/analytics/sessions/${randomUUID()}/replay`, {
      headers: authHeaders(user.token),
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(403)
  })

  test('REPLAY-B2: ADMIN + invalid sessionId → 404', async ({ request }) => {
    const s = await login(request, ADMIN_USER)
    const res = await request.get(`${BE_URL}/api/admin/analytics/sessions/${randomUUID()}/replay`, {
      headers: authHeaders(s.token),
      failOnStatusCode: false,
    })
    expect([404, 400]).toContain(res.status())
  })
})

test.describe('BE API · My creations (Gap 2)', () => {
  test('CREATIONS-H2: empty list OK', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.get(`${BE_URL}/api/me/user-creations`, {
      headers: authHeaders(user.token),
    })
    const list = await unwrap<unknown[]>(res)
    expect(Array.isArray(list)).toBe(true)
  })

  test('CREATIONS-B1: guest → 401', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/me/user-creations`, { failOnStatusCode: false })
    expect(res.status()).toBe(401)
  })
})

test.describe('BE API · Panorama by id (Gap 3)', () => {
  test('PANO-B1: invalid id → 404', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/panoramas/${randomUUID()}`, { failOnStatusCode: false })
    expect(res.status()).toBe(404)
  })

  test('PANO-H1: seed panorama by id', async ({ request }) => {
    const s = await login(request, DEMO_USER)
    const listRes = await request.get(`${BE_URL}/api/panoramas/by-location/11111111-1111-1111-1111-111111111111`, {
      headers: authHeaders(s.token),
    })
    const list = await unwrap<{ id: string }[]>(listRes)
    test.skip(list.length === 0, 'no panoramas in seed')
    const res = await request.get(`${BE_URL}/api/panoramas/${list[0].id}`, {
      headers: authHeaders(s.token),
    })
    const pano = await unwrap<{ id: string; title: string }>(res)
    expect(pano.id).toBe(list[0].id)
  })
})
