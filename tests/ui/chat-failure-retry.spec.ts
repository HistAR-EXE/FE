import { expect, test } from '@playwright/test'

const frame = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
const question = 'Câu hỏi cần giữ lại để gửi lại'
const partial = 'Câu trả lời còn dang dở'
const answer = 'Chưa tìm thấy tư liệu phù hợp cho câu hỏi này.'
const successful = frame('meta', { conversationId: 'history' })
  + frame('delta', { content: answer, sources: [] }) + frame('sources', []) + frame('complete', {})

for (const failure of ['http503', 'http504', 'partial-eof', 'partial-error'] as const) {
  test(`${failure}: preserves question/history, removes partial, retries without duplicate or false telemetry`, async ({ page }) => {
    await page.addInitScript(() => {
      for (const [key, value] of Object.entries({
        timelens_token: 'fe-test', timelens_user_id: 'fe-user', timelens_display_name: 'FE Test',
        timelens_role: 'USER', timelens_tier: 'PREMIUM', timelens_email_verified: '1', timelens_mode: 'online',
        histar_consent_v1: JSON.stringify({ analytics: true, camera: false, gps: false }),
      })) localStorage.setItem(key, value)
    })
    const sent: Record<string, unknown>[] = []
    const telemetry: string[] = []
    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (request.method() === 'POST' && !path.endsWith('/messages/stream')) telemetry.push(`${path} ${request.postData()}`)
      if (path.endsWith('/messages/stream')) {
        sent.push(request.postDataJSON())
        if (sent.length > 2) return route.fulfill({ contentType: 'text/event-stream', body: successful })
        const code = failure === 'http504' ? 'RAG_TIMEOUT' : 'RAG_UNAVAILABLE'
        const error = { code, message: 'Technical failure', status: failure === 'http504' ? 504 : 503, retryable: true, requestId: 'req-ui-123' }
        if (failure.startsWith('http')) return route.fulfill({ status: error.status, json: error })
        return route.fulfill({ contentType: 'text/event-stream', body: frame('delta', { content: partial, sources: [] }) + (failure === 'partial-error' ? frame('error', error) : '') })
      }
      let data: unknown = []
      if (path.includes('/characters/by-location/')) data = [{ id: 'chrono', name: 'Chrono', era: 'TimeLens', portraitUrl: '' }]
      else if (path === '/api/profile/me') data = {
        id: 'fe-user', displayName: 'FE Test', email: 'test@example.com', emailVerified: true,
        role: 'USER', tier: 'PREMIUM', avatarUrl: null, orgId: null, orgName: null,
        orgRole: null, orgSubscription: 'NONE', level: 1, totalPoints: 0, city: null, activeVisitSites: [],
      }
      else if (path === '/api/chat/context') data = { conversationId: 'history', history: [] }
      else if (path === '/api/chat/conversations/history/messages') data = {
        items: [
          { id: 'old-u', role: 'user', content: 'Câu hỏi trước đó', createdAt: '2026-10-01T10:00:00Z' },
          { id: 'old-a', role: 'assistant', content: 'Câu trả lời trước đó', sources: [], createdAt: '2026-10-01T10:00:01Z' },
        ], page: 0, size: 20, totalItems: 2, totalPages: 1,
      }
      else if (path.includes('public-pricing')) data = { b2cPremiumPriceVnd: 49000, chatFreeDailyLimit: 10 }
      else if (path.includes('/quota')) data = { dailyLimit: 10 }
      await route.fulfill({ json: { success: true, data } })
    })
    await page.route('**/ai/**', (route) => route.fulfill({ json: { status: 'ok' } }))
    await page.goto('/chat?locationId=11111111-1111-1111-1111-111111111111&persona=chrono&questRecord=chat-test')
    await expect(page.getByText('Câu trả lời trước đó', { exact: true })).toBeVisible()
    await page.getByPlaceholder(/Nhắn tin cho/).fill(question)
    await page.getByRole('button', { name: 'send', exact: true }).click()
    const retry = page.getByRole('button', { name: 'Gửi lại', exact: true })
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(retry).toBeVisible()
      await expect(page.getByText(question, { exact: true })).toHaveCount(1)
      await expect(page.getByText(question, { exact: true })).toBeVisible()
      await expect(page.getByText(partial, { exact: true })).toHaveCount(0)
      await expect(page.getByText(/Chưa nhận được câu trả lời/)).toBeVisible()
      if (failure !== 'partial-eof') await expect(page.getByText('Mã yêu cầu: req-ui-123')).toBeVisible()
      await expect(page.getByText('Câu hỏi trước đó', { exact: true })).toBeVisible()
      await expect(page.getByText('Câu trả lời trước đó', { exact: true })).toBeVisible()
      await page.evaluate(async () => {
        const modulePath = '/src/lib/offlineOutbox.ts'
        const { flushOutbox } = await import(/* @vite-ignore */ modulePath)
        await flushOutbox()
      })
      expect(telemetry.join('\n')).not.toMatch(/CHARACTER_CHAT_STARTED|chat_message|\/discoveries/)
      await retry.click()
      await expect.poll(() => sent.length).toBe(attempt + 2)
    }
    await expect(page.getByText(answer, { exact: true })).toBeVisible()
    await expect(retry).toHaveCount(0)
    await expect(page.getByText(/Chưa nhận được câu trả lời/)).toHaveCount(0)
    await expect(page.getByText(question, { exact: true })).toHaveCount(1)
    expect(sent).toHaveLength(3)
    expect(sent.every((payload) => payload.message === question && payload.conversationId === 'history')).toBe(true)
    await expect.poll(() => telemetry.join('\n')).toContain('CHARACTER_CHAT_STARTED')
  })
}
