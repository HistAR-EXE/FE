import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import sharp from 'sharp'

const fixtures = path.resolve(import.meta.dirname, '../fixtures')

async function mockFaceDetector(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, '__heritageFaceLandmarker', { configurable: true, value: {
      detect: async (source: { width: number; height: number }) => {
        const boxes = source.width > source.height
          ? [{ x: 0.12, y: 0.15, width: 0.23, height: 0.38 }, { x: 0.58, y: 0.15, width: 0.23, height: 0.38 }]
          : [{ x: 0.32, y: 0.16, width: 0.34, height: 0.38 }]
        return boxes.map((box) => ({
          box, eyeLeft: { x: box.x + box.width * 0.3, y: box.y + box.height * 0.38 },
          eyeRight: { x: box.x + box.width * 0.7, y: box.y + box.height * 0.38 },
          mouthCenter: { x: box.x + box.width * 0.5, y: box.y + box.height * 0.7 },
          chin: { x: box.x + box.width * 0.5, y: box.y + box.height * 0.95 }, ovalPath: null,
        }))
      },
    } })
    class FixtureFaceDetector {
      async detect(source: { width: number; height: number }) {
        const count = source.width > source.height ? 2 : 1
        return Array.from({ length: count }, (_, index) => ({
          boundingBox: count === 1
            ? { x: 210, y: 125, width: 220, height: 270 }
            : { x: 90 + index * 260, y: 90, width: 180, height: 240 },
        }))
      }
    }
    Object.defineProperty(globalThis, 'FaceDetector', { configurable: true, value: FixtureFaceDetector })
  })
}

test('ST03 time portal entry opens the two ST03 heritage roles without a preselected role', async ({ page }) => {
  await page.addInitScript(() => {
    const values = { timelens_token: 'fixture-token', timelens_user_id: 'heritage-user', timelens_display_name: 'Heritage User', timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1', timelens_mode: 'online' }
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
  })
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const data = pathname === '/api/profile/me'
      ? { id: 'heritage-user', displayName: 'Heritage User', role: 'USER', tier: 'FREE', emailVerified: true, activeVisitSites: [] }
      : pathname === '/api/photo-frames' ? []
      : pathname.endsWith('/stations/ST03') ? { id: 'st03', siteCode: 'cu-chi', code: 'ST03', name: 'Giếng hầm & thông gió', blocks: [] }
      : []
    await route.fulfill({ json: { success: true, data } })
  })
  // Existing links without mode=heritage must still land in the requested studio.
  await page.goto('/photo-frame?site=cu-chi&station=ST03&locationId=11111111-1111-1111-1111-111111111111&era=1968&source=time-portal-3d')
  await expect(page.getByRole('heading', { name: /Hóa thân 1968.*ST03/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hóa thân 1968' })).toHaveClass(/border-amber-600/)
  await expect(page.getByRole('list', { name: 'Chọn vai hóa thân năm 1968' }).getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /Người bảo đảm nước và thông khí · Nam/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Người bảo đảm nước và thông khí · Nữ/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Cán bộ liên lạc/ })).toHaveCount(0)
})

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
  await expect(page.getByRole('button', { name: 'Chọn khuôn mặt 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Chọn khuôn mặt 2' }).click()
  await expect(page.getByText('Đã ghép tự động')).toBeVisible()
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
  let uploaded: Buffer | null = null
  await page.route('**/api/user-creations', async (route) => {
    uploaded = route.request().postDataBuffer()
    await route.fulfill({ json: { success: true, data: { id: 'creation-1', frameId: null, outputUrl: '/output.jpg', variant: 'story', kind: 'heritage', createdAt: '2026-10-27T00:00:00Z', shared: false } } })
  })
  await page.goto('/photo-frame?site=cu-chi&station=ST01&locationId=11111111-1111-1111-1111-111111111111&source=battle-diorama&role=st01-can-bo-lien-lac-nam')
  await page.locator('input[type=file]').setInputFiles(path.join(fixtures, 'portrait-single-face.jpg'))
  const preview = page.locator('canvas[aria-label="Xem trước ảnh hóa thân"]')
  await expect(page.getByRole('button', { name: 'Lưu ảnh hóa thân & Chia sẻ' })).toBeEnabled()
  const firstPreview = await preview.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
  await page.getByLabel('Tăng sáng').fill('65')
  await expect.poll(async () => preview.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(firstPreview)
  await expect(preview).toHaveAttribute('width', '540')
  await expect(preview).toHaveAttribute('height', '960')
  await expect(page.getByRole('button', { name: 'Lưu ảnh hóa thân & Chia sẻ' })).toBeEnabled()
  await page.getByRole('button', { name: 'Lưu ảnh hóa thân & Chia sẻ' }).click()
  await expect.poll(() => Boolean(uploaded)).toBe(true)
  const bytes = uploaded!
  const start = bytes.indexOf(Buffer.from([0xff, 0xd8]))
  const end = bytes.lastIndexOf(Buffer.from([0xff, 0xd9]))
  const metadata = await sharp(bytes.subarray(start, end + 2)).metadata()
  expect({ width: metadata.width, height: metadata.height }).toEqual({ width: 1080, height: 1920 })
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
  await page.getByRole('button', { name: /Du kích trực gác · Nam/ }).click()
  await expect(page.locator('input[type=file]')).toHaveCount(1)
  await expect(page.locator('input[type=file]')).not.toHaveAttribute('capture')
})
