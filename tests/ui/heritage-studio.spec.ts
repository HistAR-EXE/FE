import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const fixtures = path.resolve(import.meta.dirname, '../fixtures')

async function mockFaceDetector(page: Page) {
  await page.addInitScript(() => {
    class FixtureFaceDetector {
      async detect(source: { width: number; height: number }) {
        const count = source.width > source.height ? 2 : 1
        return Array.from({ length: count }, (_, index) => ({
          boundingBox: { x: 90 + index * 260, y: 90, width: 180, height: 240 },
        }))
      }
    }
    Object.defineProperty(globalThis, 'FaceDetector', { configurable: true, value: FixtureFaceDetector })
  })
}

test('role selection and explicit multi-face choice create a composite without preloading production assets', async ({ page }) => {
  await mockFaceDetector(page)
  const requestedProductionAssets: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/media/photo-roles/')) requestedProductionAssets.push(request.url())
  })
  await page.goto('/tests/fixtures/heritage-studio-harness.html')
  await expect(page.getByRole('button', { name: /Cán bộ liên lạc · Nam/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Cán bộ liên lạc · Nữ/ }).click()
  await expect(page.getByRole('button', { name: /Cán bộ liên lạc · Nữ/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('raw-selfie').setInputFiles(path.join(fixtures, 'portrait-two-faces.jpg'))
  await expect(page.getByLabel('Chọn khuôn mặt cần dùng')).toBeVisible()
  await page.getByLabel('Chọn khuôn mặt cần dùng').selectOption('face-2')
  await expect(page.getByText('Ảnh đã được ghép. Mọi điều chỉnh bên dưới sẽ tự cập nhật bản xem trước.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lưu và chia sẻ' })).toBeEnabled()
  expect(requestedProductionAssets).toEqual([])
})

test('photo page automatically composites the selected portrait and reapplies lighting controls', async ({ page }) => {
  await mockFaceDetector(page)
  await page.addInitScript(() => {
    const values = { timelens_token: 'fixture-token', timelens_user_id: 'heritage-user', timelens_display_name: 'Heritage User', timelens_email: 'heritage@example.test', timelens_role: 'USER', timelens_tier: 'PREMIUM', timelens_email_verified: '1', timelens_mode: 'online' }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  })
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const data = pathname === '/api/profile/me'
      ? { id: 'heritage-user', email: 'heritage@example.test', displayName: 'Heritage User', role: 'USER', tier: 'PREMIUM', emailVerified: true, avatarUrl: null, orgId: null, orgSubscription: 'NONE', activeVisitSites: [] }
      : pathname === '/api/photo-frames' ? []
      : pathname.endsWith('/stations/ST01') ? { id: 'st01', siteCode: 'cu-chi', code: 'ST01', name: 'Phòng họp', sortOrder: 1, blocks: [] }
      : []
    await route.fulfill({ json: { success: true, data } })
  })
  await page.route('**/media/photo-roles/**', async (route) => {
    const relative = new URL(route.request().url()).pathname.replace('/media/photo-roles/', '')
    await route.fulfill({ path: path.resolve(import.meta.dirname, '../../heritage-assets', relative), contentType: 'image/webp' })
  })
  await page.goto('/photo-frame?site=cu-chi&station=ST01&locationId=11111111-1111-1111-1111-111111111111&source=battle-diorama&role=st01-can-bo-lien-lac-nam')
  await page.locator('input[type=file]').setInputFiles(path.join(fixtures, 'portrait-single-face.jpg'))
  const preview = page.getByAltText('Ảnh kỷ niệm đang chỉnh')
  await expect(preview).toBeVisible()
  const firstPreview = await preview.getAttribute('src')
  await page.getByLabel('Tăng sáng khuôn mặt').fill('65')
  await expect.poll(async () => preview.getAttribute('src')).not.toBe(firstPreview)
  await expect(page.getByRole('button', { name: 'Lưu ảnh hóa thân & Chia sẻ' })).toBeEnabled()
})

test('approved ST06 roles are available while camera capture remains library-only', async ({ page }) => {
  await page.addInitScript(() => {
    const values = { timelens_token: 'fixture-token', timelens_user_id: 'heritage-user', timelens_display_name: 'Heritage User', timelens_email: 'heritage@example.test', timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1', timelens_mode: 'online' }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  })
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const data = pathname === '/api/profile/me'
      ? { id: 'heritage-user', email: 'heritage@example.test', displayName: 'Heritage User', role: 'USER', tier: 'FREE', emailVerified: true, avatarUrl: null, orgId: null, orgSubscription: 'NONE', activeVisitSites: [] }
      : pathname === '/api/photo-frames' ? []
      : pathname.endsWith('/stations/ST06') ? { id: 'st06', siteCode: 'cu-chi', code: 'ST06', name: 'Hầm phòng thủ', sortOrder: 6, blocks: [] }
      : []
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/photo-frame?site=cu-chi&station=ST06&locationId=11111111-1111-1111-1111-111111111111')
  await expect(page.getByTestId('camera-locked-banner')).toContainText('chọn ảnh từ thư viện')
  await page.getByRole('button', { name: 'Hóa thân 1968' }).click()
  await expect(page.getByRole('button', { name: /Du kích trực gác · Nam/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Du kích trực gác · Nữ/ })).toBeVisible()
  await expect(page.locator('input[type=file]')).not.toHaveAttribute('capture')
})
