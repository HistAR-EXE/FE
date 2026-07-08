import { test, expect } from '@playwright/test'
import { login } from '../../helpers/api'
import { seedSession } from '../../helpers/session'

test.describe('UI · Resilience checkout spam (FE-SPAM-01)', () => {
  test('FE-SPAM-01: double-click Tạo thanh toán SePay sends only one POST', async ({ page, request }) => {
    const user = await login(request)
    await seedSession(page, user, { mode: 'online', emailVerified: true })

    let requestCount = 0
    await page.route('**/api/billing/b2c/payment', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      requestCount += 1
      await new Promise((r) => setTimeout(r, 1500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderCode: 'E2E-SPAM-01',
            status: 'PENDING',
            qrUrl: 'https://example.com/qr.png',
            transferContent: 'E2E SPAM',
            bankCode: 'MB',
            accountNumber: '000000',
            accountName: 'HistAR Test',
            amountVnd: 49000,
          },
        }),
      })
    })

    await page.goto('/checkout/b2c')
    const payBtn = page.getByRole('button', { name: 'Tạo thanh toán SePay' })
    await expect(payBtn).toBeEnabled({ timeout: 15_000 })

    await payBtn.dblclick()
    await expect(page.getByRole('button', { name: /Đang tạo QR/i })).toBeVisible()
    await expect(page.getByText('Mã thanh toán: E2E-SPAM-01')).toBeVisible({ timeout: 10_000 })

    expect(requestCount).toBe(1)
  })
})
