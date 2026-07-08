import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { SEED } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('UI · ScanPage demo check-in', () => {
  test('OFF-E2E-DEMO-01: demo badge visible and demo check-in succeeds without GPS', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'offline' })

    await page.addInitScript(() => {
      localStorage.setItem('timelens_force_demo', '1')
    })

    await page.route('**/api/demo/checkin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            locationId: SEED.cuChiLocationId,
            xpAwarded: 10,
            message: 'Demo check-in ok',
          },
        }),
      })
    })

    await page.goto(`/scan?forceDemo=1`)
    await page
      .getByPlaceholder(/timelens:location/i)
      .fill(`timelens:location:${SEED.cuChiLocationId}`)

    await expect(page.getByTestId('demo-badge')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('demo-checkin-btn').click()
    await expect(page.getByText(/Demo check-in thành công/i)).toBeVisible({ timeout: 10_000 })
  })
})
