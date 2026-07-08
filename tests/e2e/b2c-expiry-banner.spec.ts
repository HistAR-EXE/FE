import { test, expect } from '@playwright/test'
import { registerFreshUser } from '../helpers/api'
import { seedSession } from '../helpers/session'

async function mockB2cExpiry(page: import('@playwright/test').Page, daysUntilExpiry: number) {
  await page.route('**/api/billing/b2c/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          tier: 'PREMIUM',
          endDate: '2026-12-31',
          isActive: true,
          priceVnd: 49000,
          daysUntilExpiry,
        },
      }),
    })
  })
  await page.route('**/api/billing/b2c/history', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

test.describe('E2E · B2C expiry banner', () => {
  test('B2C-EXP-UI-01: Settings shows renewal banner at 7 days', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, { ...user, tier: 'PREMIUM' }, { mode: 'online' })
    await mockB2cExpiry(page, 7)
    await page.goto('/settings')
    await expect(page.getByText(/Nhắc gia hạn: còn 7 ngày đến hạn/i)).toBeVisible({ timeout: 15_000 })
  })

  test('B2C-EXP-UI-02: Settings shows renewal banner at 3 days', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, { ...user, tier: 'PREMIUM' }, { mode: 'online' })
    await mockB2cExpiry(page, 3)
    await page.goto('/settings')
    await expect(page.getByText(/Nhắc gia hạn: còn 3 ngày đến hạn/i)).toBeVisible({ timeout: 15_000 })
  })

  test('B2C-EXP-UI-03: Settings shows renewal banner at 1 day', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, { ...user, tier: 'PREMIUM' }, { mode: 'online' })
    await mockB2cExpiry(page, 1)
    await page.goto('/settings')
    await expect(page.getByText(/Nhắc gia hạn: còn 1 ngày đến hạn/i)).toBeVisible({ timeout: 15_000 })
  })
})
