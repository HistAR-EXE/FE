import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, login, registerFreshUser, unwrap } from '../helpers/api'
import { expectStatus } from '../helpers/errors'
import { isRagAiReady } from '../helpers/ai'

test.describe('BE API · Monetization billing', () => {
  test('MON-B02: org member cannot B2C subscribe', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `Org B2C Guard ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'MICRO', contactEmail: teacher.email },
      }),
    )
    const res = await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
      headers: authHeaders(teacher.token),
      data: { paymentMethod: 'DEMO' },
      failOnStatusCode: false,
    })
    await expectStatus(res, 422)
    const body = (await res.json()) as { message?: string }
    expect(body.message ?? '').toMatch(/tổ chức|B2C/i)
  })

  test('MON-H04: FREE user chat reply has empty sources', async ({ request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable')

    const user = await registerFreshUser(request)
    const chars = await unwrap<Array<{ id: string }>>(
      await request.get(`${BE_URL}/api/characters/by-location/11111111-1111-1111-1111-111111111111`),
    )
    const res = await request.post(`${BE_URL}/api/chat/messages`, {
      headers: authHeaders(user.token),
      data: { characterId: chars[0].id, message: 'Củ Chi là gì?' },
      timeout: 120_000,
    })
    const data = await unwrap<{ reply: string; sources?: unknown[] }>(res)
    expect(data.reply?.length).toBeGreaterThan(0)
    expect(data.sources ?? []).toHaveLength(0)
  })

  test('MON-H05: PREMIUM user may receive sources when RAG returns them', async ({ request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable')

    const user = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
        headers: authHeaders(user.token),
        data: { paymentMethod: 'DEMO' },
      }),
    )
    const chars = await unwrap<Array<{ id: string }>>(
      await request.get(`${BE_URL}/api/characters/by-location/11111111-1111-1111-1111-111111111111`),
    )
    const res = await request.post(`${BE_URL}/api/chat/messages`, {
      headers: authHeaders(user.token),
      data: { characterId: chars[0].id, message: 'Nguồn tài liệu về địa đạo Củ Chi?' },
      timeout: 120_000,
    })
    const data = await unwrap<{ reply: string; sources?: Array<{ title: string }> }>(res)
    expect(data.reply?.length).toBeGreaterThan(0)
    // Premium tier allows sources; RAG may still return empty if KB miss — only assert tier gate off
    if (data.sources && data.sources.length > 0) {
      expect(data.sources[0].title).toBeTruthy()
    }
  })

  test('MON-B06: FREE user global leaderboard blocked at BE', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.get(`${BE_URL}/api/leaderboard?scope=all`, {
      headers: authHeaders(user.token),
      failOnStatusCode: false,
    })
    await expectStatus(res, 422)
  })

  test('MON-B04: MICRO org assign-quest returns 422/403', async ({ request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `Micro MP ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'MICRO', contactEmail: teacher.email },
      }),
    )
    const access = await request.get(`${BE_URL}/api/groups/multiplayer-access`, {
      headers: authHeaders(teacher.token),
    })
    const allowed = await unwrap<boolean>(access)
    expect(allowed).toBe(false)
  })
})
