import { expect, test, type Page } from '@playwright/test'

const frame = (name: string, data: unknown) => `event: ${name}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`
const partial = frame('delta', { content: 'Unfinished answer', sources: [] })

test.beforeEach(async ({ page }) => {
  await page.route((url) => url.pathname.startsWith('/api/'), (route) => route.fulfill({ json: { success: true, data: [] } }))
  await page.goto('/')
})

async function runStream(page: Page, body: string, status = 200, fragmented = false) {
  return page.evaluate(async ({ body, status, fragmented }) => {
    const modulePath = '/src/features/chat/api.ts'
    const { chatApi } = await import(/* @vite-ignore */ modulePath)
    const original = window.fetch
    let cancelled = false
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of fragmented ? [...body] : [body]) controller.enqueue(new TextEncoder().encode(chunk))
        controller.close()
      },
      cancel() { cancelled = true },
    })
    window.fetch = async () => new Response(stream, { status })
    try {
      const reply = await chatApi.sendGuidedStream({ characterId: 'chrono', message: 'Question' })
      return { ok: true, reply, cancelled }
    } catch (error) {
      const e = error as Error & { code?: string; status?: number; retryable?: boolean; requestId?: string }
      return { ok: false, name: e.name, code: e.code, status: e.status, retryable: e.retryable, requestId: e.requestId }
    } finally { window.fetch = original }
  }, { body, status, fragmented })
}

for (const body of ['', partial]) {
  test(`rejects ${body ? 'partial' : 'empty'} EOF without complete`, async ({ page }) => {
    expect(await runStream(page, body)).toMatchObject({ ok: false, code: 'CHAT_STREAM_INCOMPLETE', retryable: true })
  })
}

for (const [code, status] of [['RAG_UNAVAILABLE', 503], ['RAG_TIMEOUT', 504]] as const) {
  for (const transport of ['sse', 'http'] as const) {
    test(`${transport} preserves ${code} status, retryable and requestId`, async ({ page }) => {
      const error = { code, message: 'Provider failed', retryable: true, requestId: 'req-rag-123' }
      const result = await runStream(page, transport === 'sse' ? partial + frame('error', error) : JSON.stringify(error), transport === 'sse' ? 200 : status)
      expect(result).toMatchObject({ ok: false, code, retryable: true, requestId: error.requestId, status })
    })
  }
}

test('complete with no sources is a successful answer', async ({ page }) => {
  expect(await runStream(page, partial + frame('sources', []) + frame('complete', {})))
    .toMatchObject({ ok: true, reply: { sources: [], blocks: [{ content: 'Unfinished answer' }] } })
})

test('structured errors survive CRLF split across network chunks', async ({ page }) => {
  expect(await runStream(page, frame('error', { code: 'RAG_TIMEOUT', status: 504, retryable: false, requestId: 'split-id' }), 200, true))
    .toMatchObject({ ok: false, code: 'RAG_TIMEOUT', status: 504, retryable: false, requestId: 'split-id' })
})

for (const phase of ['headers', 'body', 'delayed-body', 'no-caller'] as const) {
  test(`125s overall deadline: ${phase}`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-12T00:00:00Z') })
    await page.clock.pauseAt(new Date('2026-10-12T00:00:01Z'))
    await page.evaluate(async (phase) => {
      const modulePath = '/src/features/chat/api.ts'
      const { chatApi } = await import(/* @vite-ignore */ modulePath)
      const state = window as unknown as { result: unknown; aborted: boolean }
      state.result = 'pending'
      state.aborted = false
      window.fetch = (_url, init) => new Promise((resolve, reject) => {
        const stream = new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener('abort', () => {
              state.aborted = true
              controller.error(init.signal?.reason)
              reject(init.signal?.reason)
            }, { once: true })
          },
        })
        if (phase === 'body' || phase === 'no-caller') resolve(new Response(stream))
        if (phase === 'delayed-body') setTimeout(() => resolve(new Response(stream)), 100_000)
      })
      void chatApi.sendGuidedStream({ characterId: 'chrono', message: 'Question' }, undefined, phase === 'no-caller' ? undefined : new AbortController().signal)
        .then(() => { state.result = 'success' }, (e: { code: string; status: number; retryable: boolean }) => {
          state.result = { code: e.code, status: e.status, retryable: e.retryable }
        })
    }, phase)
    await page.clock.runFor(124_999)
    expect(await page.evaluate(() => (window as unknown as { result: unknown }).result)).toBe('pending')
    await page.clock.runFor(1)
    await expect.poll(() => page.evaluate(() => (window as unknown as { result: unknown; aborted: boolean }).result))
      .toEqual({ code: 'RAG_TIMEOUT', status: 504, retryable: true })
    expect(await page.evaluate(() => (window as unknown as { aborted: boolean }).aborted)).toBe(true)
  })
}

test('caller cancellation interrupts a stalled body', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/features/chat/api.ts'
    const { chatApi } = await import(/* @vite-ignore */ modulePath)
    const caller = new AbortController()
    window.fetch = async (_url, init) => new Response(new ReadableStream({
      start(controller) {
        init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true })
      },
    }))
    const pending = chatApi.sendGuidedStream({ characterId: 'chrono', message: 'Question' }, undefined, caller.signal)
      .then(() => 'success', (e: Error) => e.name)
    caller.abort()
    return pending
  })
  expect(result).toBe('AbortError')
})

for (const terminal of ['complete', 'error'] as const) {
  test(`${terminal} releases the open stream and clears deadline/caller listeners`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-12T00:00:00Z') })
    await page.clock.pauseAt(new Date('2026-10-12T00:00:01Z'))
    const result = await page.evaluate(async (terminal) => {
      const modulePath = '/src/features/chat/api.ts'
      const { chatApi } = await import(/* @vite-ignore */ modulePath)
      const state = window as unknown as { cancelled: boolean; transportSignal: AbortSignal }
      state.cancelled = false
      const caller = new AbortController()
      const stream = new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode(`event: ${terminal}\ndata: {}\n\n`)) },
        cancel() { state.cancelled = true },
      })
      window.fetch = async (_url, init) => { state.transportSignal = init!.signal!; return new Response(stream) }
      await chatApi.sendGuidedStream({ characterId: 'chrono', message: 'Question' }, undefined, caller.signal).catch(() => undefined)
      caller.abort()
      return { cancelled: state.cancelled, locked: stream.locked, aborted: state.transportSignal.aborted }
    }, terminal)
    expect(result).toEqual({ cancelled: true, locked: false, aborted: false })
    await page.clock.runFor(125_000)
    expect(await page.evaluate(() => (window as unknown as { transportSignal: AbortSignal }).transportSignal.aborted)).toBe(false)
  })
}
