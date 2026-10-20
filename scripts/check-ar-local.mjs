// Live local smoke check. No route mocks, no onsite check-in or reward submission.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from '@playwright/test'

const base = 'http://127.0.0.1:5175'
const email = 'premium@histar.vn', password = 'Demo@2026'
const response = await fetch(`${base}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
assert.equal(response.status, 200, 'Local email login must succeed')
const login = (await response.json()).data
assert.ok(login.accessToken || login.token)
const headers = { Authorization: `Bearer ${login.accessToken || login.token}` }
const profileResponse = await fetch(`${base}/api/profile/me`, { headers })
assert.equal(profileResponse.status, 200)
const profile = (await profileResponse.json()).data
assert.equal(profile.emailVerified, true)
const questsResponse = await fetch(`${base}/api/v2/quests?locationId=11111111-1111-1111-1111-111111111111`, { headers })
assert.equal(questsResponse.status, 200)
const quests = (await questsResponse.json()).data
assert.ok(quests.some(quest => quest.track === 'ONLINE'))
assert.ok(quests.some(quest => quest.track === 'ONSITE'))
console.log('Live API: email login, verified profile and ONLINE/ONSITE quests passed.')

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.addInitScript(() => {
    localStorage.setItem('histar_consent_v1', JSON.stringify({ analytics: false, camera: false, gps: false }))
    localStorage.setItem('timelens:product-tour-complete', 'true')
  })
  await page.goto(`${base}/login`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60000 })
  assert.ok(await page.evaluate(() => localStorage.getItem('timelens_token')))
  await page.goto(`${base}/ar-experience`)
  await page.getByRole('button', { name: 'Tải mô hình 3D' }).click()
  await page.locator('canvas[aria-label="Mô hình 3D Mũ cối"]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('.ar-model-status').waitFor({ state: 'hidden', timeout: 60000 })
  assert.equal(await page.locator('canvas[aria-label="Mô hình 3D Mũ cối"]').count(), 1)
  await fs.mkdir('test-results/ar-live', { recursive: true })
  await page.screenshot({ path: 'test-results/ar-live/logged-in-center.png', fullPage: true })
  await page.getByRole('button', { name: /AR tại nhà Laptop/ }).click()
  await page.getByRole('img', { name: 'QR mở AR trên điện thoại' }).waitFor()
  await page.goto(`${base}/scan`)
  await page.getByRole('heading', { name: 'Quét trạm Củ Chi' }).waitFor()
  console.log('Live browser: form login, authenticated AR center, real 3D, QR handoff and onsite scan page passed.')
} finally { await browser.close() }
