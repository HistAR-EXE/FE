import { test, expect } from '@playwright/test'
import { isRagAiReady } from '../helpers/ai'
import { registerFreshUser } from '../helpers/api'
import { expectStatus } from '../helpers/errors'
import {
  exhaustFreeDailyChatQuota,
  getCuChiCharacterId,
  sendChatMessage,
} from '../helpers/monetization'

test.describe('BE API · Monetization quota (real)', () => {
  test('MON-H03-real: FREE user hits daily limit on 11th message', async ({ request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable')
    test.setTimeout(15 * 60_000)

    const user = await registerFreshUser(request)
    const characterId = await getCuChiCharacterId(request)

    await exhaustFreeDailyChatQuota(request, user.token, characterId, 10)

    const blocked = await sendChatMessage(
      request,
      user.token,
      characterId,
      'Tin nhắn thứ 11 phải bị chặn quota',
    )
    await expectStatus(blocked, 403)
    const body = (await blocked.json()) as { code?: string }
    expect(body.code).toBe('QUOTA_EXCEEDED')
  })
})
