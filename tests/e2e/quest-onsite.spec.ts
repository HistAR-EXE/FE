import { test, expect } from '@playwright/test'
import { SEED } from '../helpers/constants'
import { login } from '../helpers/api'
import { seedSession } from '../helpers/session'

/**
 * Tầng 3 · FE+BE — LUỒNG 5, AC-4: quest onsite hiển thị cảnh báo "cần đến tận nơi".
 */
test.describe('E2E · Quest onsite (AC-4)', () => {
  test('quest Củ Chi (requireOnsiteCheckin=true) hiện badge "Cần đến tận nơi"', async ({ page, request }) => {
    const s = await login(request)
    await seedSession(page, s, { mode: 'online' })

    await page.goto(`/quests/${SEED.onsiteQuestId}`)
    await expect(page.getByText('Cần đến tận nơi').first()).toBeVisible({ timeout: 20_000 })
  })
})
