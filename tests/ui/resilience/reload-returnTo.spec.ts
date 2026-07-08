import { test, expect } from '@playwright/test'
import { login } from '../../helpers/api'
import { seedSession } from '../../helpers/session'

test.describe('UI · Resilience reload mid-flow (FE-RELOAD-01)', () => {
  test('FE-RELOAD-01a: F5 on /login?returnTo=/explore keeps sessionStorage histar:returnTo', async ({
    page,
  }) => {
    await page.goto('/login?returnTo=%2Fexplore')
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('histar:returnTo')))
      .toBe('/explore')

    await page.reload()
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('histar:returnTo')))
      .toBe('/explore')
  })

  test('FE-RELOAD-01b: checkout QR state is React-only — reload loses payment block (product gap)', async ({
    page,
    request,
  }) => {
    const user = await login(request)
    await seedSession(page, user, { mode: 'online', emailVerified: true })

    await page.route('**/api/billing/b2c/payment', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderCode: 'E2E-RELOAD-GAP',
            status: 'PENDING',
            qrUrl: 'https://example.com/qr-reload.png',
            transferContent: 'RELOAD GAP',
            bankCode: 'MB',
            accountNumber: '000000',
            accountName: 'HistAR Test',
            amountVnd: 49000,
          },
        }),
      })
    })

    await page.goto('/checkout/b2c')
    await page.getByRole('button', { name: 'Tạo thanh toán SePay' }).click()
    await expect(page.getByText('Mã thanh toán: E2E-RELOAD-GAP')).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await expect(page.getByText('Mã thanh toán: E2E-RELOAD-GAP')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Tạo thanh toán SePay' })).toBeVisible()
  })
})
