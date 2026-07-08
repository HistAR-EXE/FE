import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { isRagAiReady } from '../helpers/ai'
import { loadContract } from '../helpers/contracts'

test.describe('BE API · Chat hybrid fallback contract', () => {
  test('CHAT-FALLBACK-01: gemini 429 fixture schema stable', async () => {
    const fixture = loadContract<{ error: { code: number; status: string } }>('gemini-error-429.json')
    expect(fixture.error.code).toBe(429)
    expect(fixture.error.status).toMatch(/RESOURCE_EXHAUSTED/i)
  })

  test('CHAT-FALLBACK-01b: when RAG up, chat still returns reply (hybrid chain)', async ({ request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable — Yes* skip documented')

    const chars = await request.get(`${BE_URL}/api/characters/by-location/${SEED.cuChiLocationId}`)
    const charList = await unwrap<Array<{ id: string }>>(chars)
    test.skip(charList.length === 0, 'No characters in seed')

    const user = await registerFreshUser(request)
    const res = await request.post(`${BE_URL}/api/chat/messages`, {
      headers: authHeaders(user.token),
      data: { characterId: charList[0].id, message: 'Tóm tắt Củ Chi trong 1 câu.' },
      timeout: 120_000,
    })
    const data = await unwrap<{ reply: string; provider?: string }>(res)
    expect(data.reply?.length).toBeGreaterThan(0)
  })
})
