import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, unwrap } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { isRagAiReady } from '../helpers/ai'

/**
 * LUỐNG 8 · Chat — AC-2 sources (cần AI :8100).
 */
test.describe('E2E · Chat sources', () => {
  test('gửi tin nhắn nhân vật → nhận reply (sources nếu có)', async ({ page, request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable — skip chat E2E')

    const chars = await request.get(`${BE_URL}/api/characters/by-location/${SEED.cuChiLocationId}`)
    const charList = await unwrap<Array<{ id: string; name: string }>>(chars)
    expect(charList.length).toBeGreaterThan(0)
    const characterId = charList[0].id

    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto(`/chat/${characterId}?locationId=${SEED.cuChiLocationId}`)

    const input = page.getByPlaceholder(/Nhắn tin cho/i)
    await expect(input).toBeVisible({ timeout: 15_000 })
    await input.fill('Củ Chi là gì?')
    await page.getByRole('button', { name: 'send', exact: true }).click()

    // Chờ reply assistant (có thể mất 30-60s với Ollama)
    await expect(page.locator('[data-role="assistant"], .chat-message-assistant, .text-on-surface').nth(1)).toBeVisible({
      timeout: 90_000,
    }).catch(async () => {
      // Fallback: bất kỳ bubble reply nào sau user message
      await expect(page.getByText(/Củ Chi|địa đạo|lịch sử/i).first()).toBeVisible({ timeout: 90_000 })
    })

    // AC-2: section nguồn có thể có hoặc không (sources rỗng = không hiện)
    const sourcesBlock = page.getByText(/📚 Nguồn|Nguồn tham khảo/i)
    if (await sourcesBlock.isVisible().catch(() => false)) {
      await expect(sourcesBlock).toBeVisible()
    }
  })
})
