import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { denyGeolocation, reinforceGeolocationDenial } from '../helpers/permissions'

test.describe('UI · ScanPage (AC-8)', () => {
  test('CHK-B4: GPS denied hiện copy Quét QR để check-in', async ({ page, request }) => {
    const s = await login(request)
    await denyGeolocation(page)
    await seedSession(page, s, { mode: 'offline' })
    await page.goto('/scan')
    await reinforceGeolocationDenial(page)
    await page
      .getByPlaceholder(/timelens:location/i)
      .fill('timelens:location:11111111-1111-1111-1111-111111111111')
    await page.getByRole('button', { name: /Check-in ngay/i }).click()
    await expect(page.locator('p.text-error')).toContainText(/Quét QR để check-in/i, { timeout: 10_000 })
  })
})
