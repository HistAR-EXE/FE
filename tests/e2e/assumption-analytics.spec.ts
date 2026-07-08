import { test, expect } from '@playwright/test'
import { registerFreshUser } from '../helpers/api'
import { SEED } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('E2E · Assumption §12 paywall analytics', () => {
  test('ASSUMP-01: era lock emits PAYWALL_ERA_LOCKED_VIEW', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.addInitScript(() => {
      sessionStorage.removeItem('timePortalEraModalDismissed')
    })

    const events: string[] = []
    await page.route('**/api/me/analytics/events', async (route) => {
      const body = route.request().postDataJSON() as { eventType?: string }
      if (body?.eventType) events.push(body.eventType)
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
    })

    await page.goto(`/time-portal/${SEED.cuChiLocationId}`)
    await page.getByRole('button', { name: '1948' }).click()
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toBeVisible()

    await expect.poll(() => events.includes('PAYWALL_ERA_LOCKED_VIEW')).toBe(true)
  })

  test('ASSUMP-02: era upgrade click emits PAYWALL_ERA_UPGRADE_CLICK', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.addInitScript(() => {
      sessionStorage.removeItem('timePortalEraModalDismissed')
    })

    const events: string[] = []
    await page.route('**/api/me/analytics/events', async (route) => {
      const body = route.request().postDataJSON() as { eventType?: string }
      if (body?.eventType) events.push(body.eventType)
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
    })

    await page.goto(`/time-portal/${SEED.cuChiLocationId}`)
    await page.getByRole('button', { name: '1948' }).click()
    await page.getByRole('link', { name: /Nâng cấp ngay|Nâng cấp Premium/i }).click()

    await expect.poll(() => events.includes('PAYWALL_ERA_UPGRADE_CLICK')).toBe(true)
  })

  test('ASSUMP-03: chat quota modal emits view + upgrade click events', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.addInitScript(() => {
      sessionStorage.removeItem('chatQuotaModalDismissed')
    })

    const events: string[] = []
    await page.route('**/api/me/analytics/events', async (route) => {
      const body = route.request().postDataJSON() as { eventType?: string }
      if (body?.eventType) events.push(body.eventType)
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
    })
    await page.route('**/api/chat/messages', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'QUOTA_EXCEEDED',
          message: 'Đã đạt giới hạn 10 tin nhắn/ngày',
          upgradeUrl: '/pricing',
        }),
      })
    })

    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"]').fill('Trigger quota modal')
    await page.getByRole('button', { name: 'send', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Hết lượt chat hôm nay/i })).toBeVisible()

    await expect.poll(() => events.includes('PAYWALL_CHAT_QUOTA_VIEW')).toBe(true)
    await page.getByRole('button', { name: /Nâng cấp 49/i }).click()
    await expect.poll(() => events.includes('PAYWALL_CHAT_UPGRADE_CLICK')).toBe(true)
  })
})
