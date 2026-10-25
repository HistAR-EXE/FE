import { expect, test } from '@playwright/test'

test('390x844 studio fits without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tests/fixtures/heritage-studio-harness.html')
  await expect(page.getByTestId('heritage-studio')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('mobile share exports 9:16, records share, and preserves station plus Cedar Falls navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    const values = { timelens_token: 'fixture-token', timelens_user_id: 'heritage-user', timelens_display_name: 'Heritage User', timelens_email: 'heritage@example.test', timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1', timelens_mode: 'online' }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  })
  const writes: string[] = []
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (route.request().method() !== 'GET') writes.push(pathname)
    const data = pathname === '/api/profile/me'
      ? { id: 'heritage-user', email: 'heritage@example.test', displayName: 'Heritage User', role: 'USER', tier: 'FREE', emailVerified: true, avatarUrl: null, orgId: null, orgSubscription: 'NONE', activeVisitSites: [] }
      : pathname === '/api/share/prefill' ? { caption: 'Heritage fixture', hashtags: ['TimeLens'] }
      : pathname.endsWith('/stations/ST01') ? { id: 'st01', siteCode: 'cu-chi', code: 'ST01', name: 'Phòng họp', sortOrder: 1, blocks: [] }
      : pathname.endsWith('/record-share') ? { bonusPointsAwarded: 0, totalPoints: 0, shareCaption: 'Heritage fixture' }
      : []
    await route.fulfill({ json: { success: true, data } })
  })
  const query = new URLSearchParams({ creationId: 'creation-1', outputUrl: '/tests/fixtures/portrait-single-face.jpg', site: 'cu-chi', station: 'ST01', locationId: '11111111-1111-1111-1111-111111111111', source: 'battle-diorama' })
  await page.goto(`/share?${query}`)
  await expect(page.getByRole('link', { name: 'Về ST01 · Phòng họp' })).toHaveAttribute('href', '/sites/cu-chi/stations/ST01/media')
  await expect(page.getByRole('link', { name: 'Về Sa bàn Cedar Falls' })).toHaveAttribute('href', '/diorama/11111111-1111-1111-1111-111111111111')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải ảnh 9:16' }).click()
  expect((await download).suggestedFilename()).toBe('timelens-heritage-9x16.jpg')
  await page.getByRole('button', { name: 'Chia sẻ ngay' }).click()
  await expect.poll(() => writes.filter((path) => path.endsWith('/record-share')).length).toBe(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
