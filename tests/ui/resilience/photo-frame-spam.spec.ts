import { test, expect } from '@playwright/test'
import { login } from '../../helpers/api'
import { seedSession } from '../../helpers/session'
import { getFreeFrameId } from '../../helpers/monetization'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('UI · Resilience photo frame spam', () => {
  test('FE-SPAM-02: double-click Tạo & Chia sẻ sends only one POST /api/user-creations', async ({
    page,
    request,
  }) => {
    const freeFrameId = await getFreeFrameId(request)
    const user = await login(request)
    await seedSession(page, user, { mode: 'online' })

    let postCount = 0
    await page.route('**/api/user-creations', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      postCount += 1
      await new Promise((r) => setTimeout(r, 1200))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'creation-spam-01', shareUrl: '/share/creation-spam-01' },
        }),
      })
    })

    await page.goto('/photo-frame')
    await page.locator('select').selectOption(freeFrameId)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })

    const submit = page.getByRole('button', { name: /Tạo & Chia sẻ/i })
    await submit.dblclick()
    await expect(page.getByRole('button', { name: /Đang upload/i })).toBeVisible()
    await page.waitForTimeout(2000)

    expect(postCount).toBe(1)
  })
})
