import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, unwrap } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { isRagAiReady } from '../helpers/ai'

/**
 * Tier 4 — FE → BE → AI full stack (GP-CHAT-01).
 */
test.describe('E2E · Chat full stack', () => {
  test('GP-CHAT-01: login → chat → RAG reply via BE orchestration', async ({ page, request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable — run scripts/diagnose-chat.ps1')

    const chars = await request.get(`${BE_URL}/api/characters/by-location/${SEED.cuChiLocationId}`)
    const charList = await unwrap<Array<{ id: string }>>(chars)
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })

    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    const input = page.getByPlaceholder(/Nhắn tin cho/i)
    await expect(input).toBeVisible({ timeout: 30_000 })
    await input.fill('Kể ngắn về địa đạo Củ Chi')
    await page.getByRole('button', { name: 'send', exact: true }).click()

    await expect(page.getByText(/địa đạo|Củ Chi|hầm/i).first()).toBeVisible({ timeout: 120_000 })
  })
})
