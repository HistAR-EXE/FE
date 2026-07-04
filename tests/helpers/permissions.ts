import { type BrowserContext, type Page } from '@playwright/test'

const GEO_DENY_SCRIPT = () => {
  const denied = {
    code: 1,
    message: 'User denied Geolocation',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  }
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (_success: PositionCallback, error?: PositionErrorCallback) => {
        error?.(denied as GeolocationPositionError)
      },
      watchPosition: () => 0,
      clearWatch: () => undefined,
    },
  })
}

/** Inject geolocation denial before page load (AC-8 ScanPage). */
export async function denyGeolocation(page: Page) {
  await page.context().clearPermissions()
  await page.addInitScript(GEO_DENY_SCRIPT)
}

/** Re-apply denial after navigation — Playwright may restore native geolocation. */
export async function reinforceGeolocationDenial(page: Page) {
  await page.evaluate(GEO_DENY_SCRIPT)
  try {
    const session = await page.context().newCDPSession(page)
    const origin = new URL(page.url()).origin
    await session.send('Browser.setPermission', {
      origin,
      permission: { name: 'geolocation' },
      setting: 'denied',
    })
  } catch {
    // CDP permission override is best-effort (non-Chromium runners).
  }
}

/** Clear granted permissions for context (camera/mic/geo). */
export async function clearBrowserPermissions(context: BrowserContext) {
  await context.clearPermissions()
}
