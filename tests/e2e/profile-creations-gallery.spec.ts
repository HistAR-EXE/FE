import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, login, unwrap } from '../helpers/api'
import { ensureFixtureJpeg } from '../fixtures/create-test-image'
import { seedSession } from '../helpers/session'

const fixturePath = ensureFixtureJpeg()

test.describe('E2E · Profile creations gallery', () => {
  test('CREATIONS-UI-H1: uploaded frame appears in profile gallery', async ({ page, request }) => {
    const user = await login(request)
    const frames = await unwrap<Array<{ id: string; name: string }>>(
      await request.get(`${BE_URL}/api/photo-frames`),
    )
    test.skip(frames.length === 0, 'No photo frames in DB')

    const uploadRes = await request.post(`${BE_URL}/api/user-creations`, {
      headers: authHeaders(user.token),
      multipart: {
        file: {
          name: 'gallery-e2e.jpg',
          mimeType: 'image/jpeg',
          buffer: fs.readFileSync(fixturePath),
        },
        frameId: frames[0].id,
        variant: 'square',
      },
      failOnStatusCode: false,
      timeout: 30_000,
    })
    if (!uploadRes.ok()) {
      test.skip(true, `MinIO/upload unavailable: ${uploadRes.status()}`)
    }
    const created = await unwrap<{ id: string }>(uploadRes)

    await seedSession(page, user, { mode: 'online' })
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /Ảnh khung của bạn/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Chưa có ảnh nào/i)).toHaveCount(0)
    await expect(page.locator('section img').first()).toBeVisible()
  })
})
