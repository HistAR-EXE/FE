import { test, expect } from '@playwright/test'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('UI · Quests nav online', () => {
  test('MOD: /quests không dimmed ở online mode', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/explore')
    const questsLink = page.locator('nav').getByRole('link', { name: 'Nhiệm vụ' })
    await expect(questsLink.first()).toBeVisible({ timeout: 15_000 })
    await expect(questsLink.first()).not.toHaveClass(/opacity-50/)
  })
})
