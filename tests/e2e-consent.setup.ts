import { chromium, type FullConfig } from '@playwright/test'
import { existsSync } from 'fs'

export default async function seedConsent(config: FullConfig) {
  // If consent file already exists, skip regeneration (avoids EPERM on overlayFS)
  if (existsSync('/tmp/e2e-consent.json')) return

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  const baseURL = String(config.projects.find((project) => project.name === '3-fullstack-e2e')?.use.baseURL ?? 'http://localhost:5173')
  await page.goto(baseURL)
  await page.evaluate(() => localStorage.setItem('histar_consent_v1', JSON.stringify({ analytics: false, camera: false, gps: false })))
  await context.storageState({ path: '/tmp/e2e-consent.json' })
  await browser.close()
}
