import { expect, test } from '@playwright/test'
import path from 'node:path'
import sharp from 'sharp'

const portrait = path.resolve(import.meta.dirname, '../fixtures/portrait-single-face.jpg')

test('raw selfie stays local and explicit save uploads exactly one generated composite', async ({ page }) => {
  const modelResponses: Array<{ path: string; status: number }> = []
  const externalModelRequests: string[] = []
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname
    if (path.startsWith('/vendor/mediapipe/')) modelResponses.push({ path, status: response.status() })
  })
  page.on('request', (request) => {
    if (/mediapipe-models|cdn\.jsdelivr/.test(request.url())) externalModelRequests.push(request.url())
  })
  await page.addInitScript(() => {
    class FixtureFaceDetector {
      async detect() { return [{ boundingBox: { x: 120, y: 100, width: 220, height: 280 } }] }
    }
    Object.defineProperty(globalThis, 'FaceDetector', { configurable: true, value: FixtureFaceDetector })
  })
  const uploads: Buffer[] = []
  await page.route('**/api/user-creations', async (route) => {
    uploads.push(route.request().postDataBuffer() ?? Buffer.alloc(0))
    await route.fulfill({ json: { success: true, data: { id: 'creation-1', frameId: null, outputUrl: '/tests/fixtures/portrait-single-face.jpg', variant: 'story', createdAt: '2026-10-25T00:00:00Z', shared: false } } })
  })
  await page.goto('/tests/fixtures/heritage-studio-harness.html')
  await page.getByTestId('raw-selfie').setInputFiles(portrait)
  await expect.poll(() => uploads.length).toBe(0)
  await expect(page.getByText('Đã ghép tự động')).toBeVisible()
  expect(modelResponses).toEqual(expect.arrayContaining([
    { path: '/vendor/mediapipe/vision_wasm_internal.js', status: 200 },
    { path: '/vendor/mediapipe/vision_wasm_internal.wasm', status: 200 },
    { path: '/vendor/mediapipe/face_landmarker.task', status: 200 },
  ]))
  expect(externalModelRequests).toEqual([])
  await expect(page.getByRole('button', { name: 'Lưu và chia sẻ' })).toBeEnabled()
  expect(uploads).toHaveLength(0)
  await page.getByRole('button', { name: 'Lưu và chia sẻ' }).click()
  await expect(page.getByTestId('share-path')).toHaveAttribute('href', /source=battle-diorama/)
  expect(uploads).toHaveLength(1)
  const multipart = uploads[0].toString('latin1')
  expect(multipart).toContain('filename="timelens-test-st01-nam-story.jpg"')
  expect(multipart).not.toContain('portrait-single-face.jpg')
  expect(multipart).not.toContain('name="frameId"')
  const start = uploads[0].indexOf(Buffer.from([0xff, 0xd8]))
  const end = uploads[0].lastIndexOf(Buffer.from([0xff, 0xd9]))
  const metadata = await sharp(uploads[0].subarray(start, end + 2)).metadata()
  expect({ width: metadata.width, height: metadata.height }).toEqual({ width: 1080, height: 1920 })
})
