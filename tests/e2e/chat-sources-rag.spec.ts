import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'
import { isRagAiReady } from '../helpers/ai'

test.describe('E2E · Chat RAG sources (AC-2 API)', () => {
  test('CHAT-H1: sources[] shape khi AI up', async ({ request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable')

    const chars = await request.get(`${BE_URL}/api/characters/by-location/${SEED.cuChiLocationId}`)
    const charList = await unwrap<Array<{ id: string }>>(chars)
    const s = await login(request)
    const res = await request.post(`${BE_URL}/api/chat/messages`, {
      headers: authHeaders(s.token),
      data: { characterId: charList[0].id, message: 'Địa đạo Củ Chi dài bao nhiêu km?' },
      timeout: 120_000,
    })
    const data = await unwrap<{ reply: string; sources?: Array<{ title: string; excerpt: string }> }>(res)
    expect(data.reply.length).toBeGreaterThan(5)
    if (data.sources && data.sources.length > 0) {
      expect(data.sources[0].title).toBeTruthy()
      expect(data.sources[0].excerpt).toBeTruthy()
    }
  })
})
