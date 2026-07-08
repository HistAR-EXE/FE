import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { expectStatus } from '../helpers/errors'
import { isRagAiReady } from '../helpers/ai'

test.describe('BE API · Chat orchestrated', () => {
  test('CHAT-H1: POST /api/chat/messages trả reply (AI up)', async ({ request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable — skip chat API happy path')

    const chars = await request.get(`${BE_URL}/api/characters/by-location/${SEED.cuChiLocationId}`)
    const charList = await unwrap<Array<{ id: string }>>(chars)
    expect(charList.length).toBeGreaterThan(0)

    const s = await registerFreshUser(request)
    const res = await request.post(`${BE_URL}/api/chat/messages`, {
      headers: authHeaders(s.token),
      data: { characterId: charList[0].id, message: 'Củ Chi là gì?' },
      timeout: 120_000,
    })
    const data = await unwrap<{ reply: string; sources?: Array<{ title: string; excerpt: string }> }>(res)
    expect(data.reply?.length).toBeGreaterThan(0)
    if (data.sources && data.sources.length > 0) {
      expect(data.sources[0].title).toBeTruthy()
    }
  })

  test('CHAT-B1: no JWT → 401', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/chat/messages`, {
      data: { characterId: SEED.cuChiLocationId, message: 'test' },
      failOnStatusCode: false,
    })
    await expectStatus(res, 401)
  })
})
