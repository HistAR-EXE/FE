import { test, expect } from '@playwright/test'
import { registerFreshUser } from '../helpers/api'
import { SEED } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('UI · Chat AI offline banner', () => {
  test('CHAT-B5: AI/chat health fail shows offline banner then unroutes', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })

    const fulfill503 = async (route: import('@playwright/test').Route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      })
    }

    await page.route('**/ai/health', fulfill503)
    await page.route('**/ai/chat**', fulfill503)
    // Also cover BE chat path if health probe goes through proxy patterns used elsewhere
    await page.route('**/api/v1/chat/**', fulfill503)

    try {
      await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
      await expect(page.getByText(/BE fallback · RAG offline/i)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(/AI service \(:8100\) hoặc Ollama chưa sẵn sàng/i)).toBeVisible()
    } finally {
      await page.unroute('**/ai/health')
      await page.unroute('**/ai/chat**')
      await page.unroute('**/api/v1/chat/**')
    }
  })
})
