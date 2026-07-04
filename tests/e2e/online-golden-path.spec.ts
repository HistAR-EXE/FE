import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('E2E · Online golden path', () => {
  test('GP-H1: explore → heritage tabs → tour360 → portal', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })

    await page.goto('/explore')
    await expect(page.getByText(/Củ Chi/i).first()).toBeVisible({ timeout: 20_000 })

    await page.goto(`/explore/${SEED.cuChiLocationId}`)
    await expect(page.getByRole('button', { name: 'Trải nghiệm' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Trải nghiệm' }).click()
    await page.getByRole('link', { name: /Tour 360/i }).click()
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })

    await page.goto(`/time-portal/${SEED.cuChiLocationId}`)
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })

    const quests = await request.get(`${BE_URL}/api/me/quests`, {
      headers: authHeaders(s.token),
      params: { size: 20 },
    })
    const qPage = await unwrap<{ items: unknown[] }>(quests)
    expect(qPage.items.length).toBeGreaterThan(0)
  })
})
