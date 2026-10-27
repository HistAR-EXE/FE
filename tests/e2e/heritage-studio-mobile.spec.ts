import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

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
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value: string) => { (window as typeof window & { __copied?: string }).__copied = value },
    } })
  })
  const writes: string[] = []
  const imageReads: string[] = []
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === '/api/user-creations/creation-1/image') {
      imageReads.push(pathname)
      return route.fulfill({ body: await readFile(path.resolve(import.meta.dirname, '../fixtures/portrait-single-face.jpg')), contentType: 'application/octet-stream' })
    }
    if (route.request().method() !== 'GET') writes.push(pathname)
    const data = pathname === '/api/profile/me'
      ? { id: 'heritage-user', email: 'heritage@example.test', displayName: 'Heritage User', role: 'USER', tier: 'FREE', emailVerified: true, avatarUrl: null, orgId: null, orgSubscription: 'NONE', activeVisitSites: [] }
      : pathname === '/api/share/prefill' ? { caption: 'Heritage fixture', hashtags: ['TimeLens'] }
      : pathname.endsWith('/stations/ST01') ? { id: 'st01', siteCode: 'cu-chi', code: 'ST01', name: 'Phòng họp', sortOrder: 1, blocks: [] }
      : pathname.endsWith('/record-share') ? { bonusPointsAwarded: 0, totalPoints: 0, shareCaption: 'Heritage fixture' }
      : []
    await route.fulfill({ json: { success: true, data } })
  })
  const query = new URLSearchParams({ creationId: 'creation-1', outputUrl: '/tests/fixtures/portrait-single-face.jpg', site: 'cu-chi', station: 'ST01', locationId: '11111111-1111-1111-1111-111111111111', source: 'battle-diorama', role: 'st01-can-bo-lien-lac-nam' })
  await page.goto(`/share?${query}`)
  await expect(page.locator('header a[href^="/photo-frame"]:visible')).toHaveAttribute('href', /\/photo-frame\?.*role=st01-can-bo-lien-lac-nam.*source=battle-diorama/)
  await expect(page.getByRole('img', { name: 'Ảnh kỷ niệm để chia sẻ' })).toHaveCSS('object-fit', 'contain')
  await expect(page.getByRole('link', { name: 'Về ST01 · Phòng họp' })).toHaveAttribute('href', '/sites/cu-chi/stations/ST01/media')
  await expect(page.getByRole('link', { name: 'Về Sa bàn Cedar Falls' })).toHaveAttribute('href', '/diorama/11111111-1111-1111-1111-111111111111')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải ảnh 9:16' }).click()
  expect((await download).suggestedFilename()).toBe('timelens-heritage-9x16.jpg')
  expect(imageReads).toHaveLength(1)
  await page.getByRole('button', { name: 'Chia sẻ ngay' }).click()
  await expect.poll(() => writes.filter((path) => path.endsWith('/record-share')).length).toBe(1)
  await page.getByRole('button', { name: 'Sao chép lời nhắn' }).click()
  expect(await page.evaluate(() => (window as typeof window & { __copied?: string }).__copied)).toBe('Heritage fixture')
  const shortcutDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Lưu để đăng' }).click()
  expect((await shortcutDownload).suggestedFilename()).toBe('timelens-heritage-9x16.jpg')
  await page.getByRole('button', { name: 'Chia sẻ ảnh' }).click()
  await expect.poll(() => writes.filter((path) => path.endsWith('/record-share')).length).toBe(2)
  await page.getByRole('button', { name: 'Sao chép liên kết' }).click()
  expect(await page.evaluate(() => (window as typeof window & { __copied?: string }).__copied)).toBe('/tests/fixtures/portrait-single-face.jpg')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('img', { name: 'Ảnh kỷ niệm để chia sẻ' })).toHaveCSS('object-fit', 'contain')
  await expect(page.getByRole('link', { name: 'Quay về chỉnh ảnh' }).first()).toBeVisible()
})
