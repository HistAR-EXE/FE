import { test, expect } from '@playwright/test'
import { registerFreshUser } from '../helpers/api'
import { SEED } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('E2E · AC-M04 chat sources tier hint', () => {
  test('AC-M04-UI: FREE user sees upgrade hint when reply has no sources', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })

    await page.route('**/api/chat/messages', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            reply: 'Địa đạo Củ Chi là hệ thống hầm ngầm lịch sử.',
            conversationId: 'e2e-conv-free',
            sources: [],
          },
        }),
      })
    })

    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"]').fill('Kể về Củ Chi')
    await page.getByRole('button', { name: 'send', exact: true }).click()

    await expect(
      page.getByText(/Nâng cấp Premium để xem nguồn tài liệu chính thống/i),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Nguồn \(kho tư liệu di tích\)/i)).toHaveCount(0)
  })

  test('AC-M04-UI-Premium: PREMIUM user sees sources block when mock returns sources', async ({
    page,
    request,
  }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, { ...user, tier: 'PREMIUM' }, { mode: 'online' })

    await page.route('**/api/chat/messages', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            reply: 'Củ Chi có nhiều tài liệu lưu trữ.',
            conversationId: 'e2e-conv-premium',
            sources: [{ title: 'Bảo tàng Chứng tích Chiến tranh', excerpt: 'Tài liệu Củ Chi' }],
          },
        }),
      })
    })

    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"]').fill('Nguồn tài liệu?')
    await page.getByRole('button', { name: 'send', exact: true }).click()

    await expect(page.getByText(/Nguồn \(kho tư liệu di tích\)/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Bảo tàng Chứng tích/i)).toBeVisible()
    await expect(
      page.getByText(/Nâng cấp Premium để xem nguồn tài liệu chính thống/i),
    ).toHaveCount(0)
  })
})
