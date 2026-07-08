import { type Page, expect } from '@playwright/test'

/** Open Time Portal and click an era tab after scenes load. */
export async function gotoTimePortalAndClickEra(page: Page, locationId: string, eraLabel: string) {
  await page.addInitScript(() => {
    sessionStorage.removeItem('timePortalEraModalDismissed')
  })
  await Promise.all([
    page.waitForResponse(
      (r) =>
        (r.url().includes('/api/photo-scenes') || r.url().includes('/api/locations')) && r.ok(),
      { timeout: 45_000 },
    ),
    page.goto(`/time-portal/${locationId}`),
  ]).catch(() => page.goto(`/time-portal/${locationId}`))

  await expect(page.locator('main')).toBeVisible({ timeout: 30_000 })
  const eraBtn = page.locator('main').getByRole('button', { name: new RegExp(eraLabel) })
  await expect(eraBtn.first()).toBeVisible({ timeout: 30_000 })
  await eraBtn.first().click()
}
