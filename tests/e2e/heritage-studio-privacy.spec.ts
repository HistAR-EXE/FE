import { expect, test } from '@playwright/test'
import path from 'node:path'

const portrait = path.resolve(import.meta.dirname, '../fixtures/portrait-single-face.jpg')

test('raw selfie stays local and explicit save uploads exactly one generated composite', async ({ page }) => {
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
  await expect(page.getByText('Ảnh đã được ghép. Mọi điều chỉnh bên dưới sẽ tự cập nhật bản xem trước.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lưu và chia sẻ' })).toBeEnabled()
  expect(uploads).toHaveLength(0)
  await page.getByRole('button', { name: 'Lưu và chia sẻ' }).click()
  await expect(page.getByTestId('share-path')).toHaveAttribute('href', /source=battle-diorama/)
  expect(uploads).toHaveLength(1)
  const multipart = uploads[0].toString('latin1')
  expect(multipart).toContain('filename="timelens-test-st01-nam-story.jpg"')
  expect(multipart).not.toContain('portrait-single-face.jpg')
  expect(multipart).not.toContain('name="frameId"')
})
