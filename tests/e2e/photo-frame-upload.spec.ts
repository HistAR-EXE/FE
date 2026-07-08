import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'
import { getFreeFrameId } from '../helpers/monetization'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('E2E · Photo frame upload (AC-14)', () => {
  test('VIR-H2: chọn ảnh fixture free frame → upload thành công', async ({ page, request }) => {
    const freeFrameId = await getFreeFrameId(request)
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto('/photo-frame')
    await expect(page.getByText(/Chọn từ thư viện ảnh/i)).toBeVisible({ timeout: 15_000 })

    await page.locator('select').selectOption(freeFrameId)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })

    const submit = page.getByRole('button', { name: /Tạo & Chia sẻ/i })
    await submit.click()
    await expect(page.getByRole('button', { name: /Đang upload/i })).toBeVisible({ timeout: 5_000 }).catch(() => undefined)

    await expect(page).toHaveURL(/\/share/, { timeout: 60_000 })
  })
})
