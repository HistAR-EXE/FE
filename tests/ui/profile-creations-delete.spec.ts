import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const profile = {
  id: 'owner-a', email: 'owner@example.test', displayName: 'Owner', role: 'USER', tier: 'FREE',
  emailVerified: true, avatarUrl: null, orgId: null, orgName: null, orgSubscription: 'NONE', orgRole: null,
  totalPoints: 0, level: 1, city: null, activeVisitSites: [],
}

test('saved creations use authenticated image bytes and retry a failed preview', async ({ page }) => {
  await setup(page)
  let requests = 0
  await page.route('**/api/user-creations/creation-1/image', route => {
    requests++
    expect(route.request().headers().authorization).toBe('Bearer fixture-token')
    if (requests === 1) return route.fulfill({ status: 503, body: 'unavailable' })
    return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a00sAAAAASUVORK5CYII=', 'base64') })
  })
  await page.goto('/profile')
  await expect(page.getByRole('button', { name: 'Thử tải lại ảnh' })).toBeVisible()
  await page.getByRole('button', { name: 'Thử tải lại ảnh' }).click()
  const image = page.locator('.pf-creation img')
  await expect(image).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(1)
  expect(requests).toBe(2)
})

test('saved review and download use account image bytes, not direct storage URLs', async ({ page }) => {
  await setup(page)
  await page.route('**/api/user-creations/creation-1/image', route => {
    expect(route.request().headers().authorization).toBe('Bearer fixture-token')
    return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a00sAAAAASUVORK5CYII=', 'base64') })
  })
  await page.goto('/photo-frame?creationId=creation-1&step=review')
  await expect(page.getByRole('img', { name: 'Ảnh đã lưu của bạn', exact: true })).toHaveAttribute('src', /^blob:/)
  await page.getByRole('button', { name: /Tiếp tục tải & chia sẻ/ }).click()
  await expect(page.getByRole('button', { name: 'Chia sẻ qua thiết bị' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Sao chép liên kết ảnh' })).toHaveCount(0)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải ảnh 9:16' }).click()
  const download = await pending
  expect(download.suggestedFilename()).toBe('timelens-9x16.png')
})

async function setup(page: Page) {
  await page.addInitScript(() => {
    const values = {
      timelens_token: 'fixture-token', timelens_user_id: 'owner-a', timelens_display_name: 'Owner',
      timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1', timelens_mode: 'online',
      'timelens:product-tour-complete': 'true',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }),
    }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  })
  let deleteStatus = 204
  const deletions: string[] = []
  await page.route((url) => url.pathname.startsWith('/media/badges/') || url.pathname.startsWith('/badges/'), (route) => route.fulfill({ status: 404, body: '' }))
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/user-creations/creation-1' && route.request().method() === 'DELETE') {
      deletions.push(path)
      return route.fulfill({ status: deleteStatus, body: deleteStatus === 204 ? '' : '{"message":"failed"}', contentType: 'application/json' })
    }
    const data = path === '/api/profile/me' ? profile
      : path === '/api/profile/overview' ? { profile, account: {}, stats: { completedQuests: 0, discoveredLocations: 0, checkedInLocations: 0, passportStamps: 0, earnedBadges: 0 }, passportStamps: [], locations: [] }
      : path === '/api/me/explore' ? { profile, discovery: { discovered: 0, total: 0, keys: [], version: 1 }, archiveXp: 0, badges: [] }
      : path === '/api/me/passport' ? { stamps: [] }
      : path === '/api/me/discoveries/visited-locations' ? { visitedLocationIds: [], visitedCount: 0 }
      : path === '/api/me/user-creations' ? [{ id: 'creation-1', outputUrl: '/brand/icon-192.png', variant: 'story', createdAt: '2026-10-27T00:00:00Z', shared: false }]
      : []
    return route.fulfill({ json: { success: true, data } })
  })
  return { deletions, failDeletion: () => { deleteStatus = 503 } }
}

test('profile asks before deleting an owned image and removes it only after success', async ({ page }) => {
  const { deletions } = await setup(page)
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Ảnh khung của bạn' })).toBeVisible()
  const deleteButton = page.getByRole('button', { name: 'Xóa ảnh ngày 27/10/2026' })
  await deleteButton.click()
  await page.getByRole('button', { name: 'Hủy' }).click()
  expect(deletions).toHaveLength(0)
  await expect(page.getByRole('link', { name: 'Xem ảnh ngày 27/10/2026' })).toBeVisible()
  await deleteButton.click()
  await page.getByRole('group', { name: 'Xác nhận xóa ảnh' }).getByRole('button', { name: 'Xóa' }).click()
  await expect(page.getByRole('link', { name: 'Xem ảnh ngày 27/10/2026' })).toHaveCount(0)
  expect(deletions).toEqual(['/api/user-creations/creation-1'])
})

test('profile keeps the image when deletion fails', async ({ page }) => {
  const { failDeletion } = await setup(page)
  failDeletion()
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Xóa ảnh ngày 27/10/2026' }).click()
  await page.getByRole('group', { name: 'Xác nhận xóa ảnh' }).getByRole('button', { name: 'Xóa' }).click()
  await expect(page.getByRole('link', { name: 'Xem ảnh ngày 27/10/2026' })).toBeVisible()
  await expect(page.getByText('Không thể xóa ảnh. Vui lòng thử lại.')).toBeVisible()
})

test('photo editor uses the feature page header pattern on desktop', async ({ page }) => {
  await setup(page)
  await page.goto('/photo-frame?returnTo=%2Fprofile')
  await expect(page.getByRole('heading', { name: 'Ảnh kỷ niệm' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Về hành trình' })).toBeVisible()
  await expect(page.locator('header:visible')).toHaveCount(0)
})

test('photo editor starts with an upload prompt instead of an illustrated portrait', async ({ page }) => {
  await setup(page)
  await page.goto('/photo-frame?returnTo=%2Fprofile')
  const emptyPreview = page.getByTestId('photo-frame-empty-preview')
  await expect(emptyPreview).toBeVisible()
  await expect(emptyPreview.locator('img')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Lưu ảnh & Chia sẻ' })).toBeDisabled()
  await page.getByLabel('Chọn ảnh cho khung kỷ niệm').setInputFiles(path.resolve(import.meta.dirname, '../fixtures/portrait-single-face.jpg'))
  await expect(emptyPreview).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'Ảnh kỷ niệm đang chỉnh' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lưu ảnh & Chia sẻ' })).toBeEnabled()
})

test('share page matches the light photo editor and does not offer Undo for an older saved photo', async ({ page }) => {
  await setup(page)
  await page.goto('/share?creationId=creation-1&outputUrl=%2Fbrand%2Ficon-192.png&kind=heritage&variant=story')
  await expect(page.getByRole('img', { name: 'Ảnh kỷ niệm để chia sẻ' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Quay về chỉnh ảnh' })).toBeVisible()
  const mainBackground = await page.locator('main').evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(mainBackground).toBe('rgb(242, 247, 255)')
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toHaveCount(0)
})

test('Undo deletes the just-saved photo and restores the original edit', async ({ page }) => {
  const { deletions } = await setup(page)
  await page.route('**/api/user-creations', async (route) => route.fulfill({ json: { success: true, data: {
    id: 'creation-1', outputUrl: '/brand/icon-192.png', variant: 'square', kind: 'original', createdAt: '2026-10-27T00:00:00Z', shared: false,
  } } }))
  await page.goto('/photo-frame?returnTo=%2Fprofile')
  await page.getByLabel('Chọn ảnh cho khung kỷ niệm').setInputFiles(path.resolve(import.meta.dirname, '../fixtures/portrait-single-face.jpg'))
  await page.getByLabel('Tăng sáng').fill('65')
  await page.getByRole('button', { name: 'Lưu ảnh & Chia sẻ' }).click()
  await expect(page).toHaveURL(/\/share\?/)
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeVisible()
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await expect(page.getByRole('alertdialog', { name: 'Xác nhận hoàn tác' })).toBeVisible()
  await page.getByRole('button', { name: 'Giữ ảnh' }).click()
  expect(deletions).toHaveLength(0)
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await page.getByRole('button', { name: 'Xóa ảnh và quay lại' }).click()
  await expect(page).toHaveURL(/\/photo-frame/)
  await expect(page.getByRole('img', { name: 'Ảnh kỷ niệm đang chỉnh' })).toBeVisible()
  await expect(page.getByLabel('Tăng sáng')).toHaveValue('65')
  expect(deletions).toEqual(['/api/user-creations/creation-1'])
})

test('failed Undo keeps the saved photo on the share page', async ({ page }) => {
  const { failDeletion } = await setup(page)
  failDeletion()
  await page.route('**/api/user-creations', async (route) => route.fulfill({ json: { success: true, data: {
    id: 'creation-1', outputUrl: '/brand/icon-192.png', variant: 'square', kind: 'original', createdAt: '2026-10-27T00:00:00Z', shared: false,
  } } }))
  await page.goto('/photo-frame')
  await page.getByLabel('Chọn ảnh cho khung kỷ niệm').setInputFiles(path.resolve(import.meta.dirname, '../fixtures/portrait-single-face.jpg'))
  await page.getByRole('button', { name: 'Lưu ảnh & Chia sẻ' }).click()
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeVisible()
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await page.getByRole('button', { name: 'Xóa ảnh và quay lại' }).click()
  await expect(page).toHaveURL(/\/share\?/)
  await expect(page.getByRole('img', { name: 'Ảnh kỷ niệm để chia sẻ' })).toBeVisible()
  await expect(page.getByText('Không thể hoàn tác ảnh vừa lưu. Ảnh vẫn còn trong Hồ sơ; vui lòng thử lại.')).toBeVisible()
})

test('share page has no illustrated fallback when a saved image is missing', async ({ page }) => {
  await setup(page)
  await page.goto('/share')
  await expect(page.getByText('Chưa có ảnh để chia sẻ')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ảnh kỷ niệm để chia sẻ' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Chia sẻ ngay' })).toBeDisabled()
})
