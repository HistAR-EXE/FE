import { test, expect } from '@playwright/test'
import { SEED } from '../helpers/constants'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('UI · Heritage tabs (FR-03 / AC-1)', () => {
  test('HER-H1: 3 tab Tổng quan / Trải nghiệm / Nhân vật', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.goto(`/explore/${SEED.cuChiLocationId}`)
    await expect(page.getByRole('button', { name: 'Tổng quan' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Trải nghiệm' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nhân vật' })).toBeVisible()

    await page.getByRole('button', { name: 'Trải nghiệm' }).click()
    await expect(page.getByRole('link', { name: /Tour 360/i })).toBeVisible()

    await page.getByRole('button', { name: 'Nhân vật' }).click()
    await expect(page.getByText(/Nhân vật khả dụng/i)).toBeVisible()
  })
})
