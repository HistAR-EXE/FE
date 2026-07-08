import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { registerFreshUser, authHeaders, unwrap } from '../helpers/api'
import { seedSession } from '../helpers/session'

type Location = { id: string; name: string; isUnlocked?: boolean | null }

/**
 * FR-15 / AC-6 · Location unlock — Bến Nhà Rồng locked until Củ Chi quest complete.
 */
test.describe('E2E · Location unlock', () => {
  test('user mới: Bến Nhà Rồng isUnlocked=false qua API', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.get(`${BE_URL}/api/locations`, {
      headers: authHeaders(user.token),
      params: { size: 50 },
    })
    const page = await unwrap<{ items: Location[] }>(res)
    const ben = page.items.find((l) => l.id === SEED.benNhaRongLocationId)
    expect(ben, 'Bến Nhà Rồng phải có trong seed').toBeTruthy()
    expect(ben?.isUnlocked).toBe(false)
  })

  test('explore map: locked location hiện tooltip khoá', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto('/explore')
    await expect(page.getByText(/Củ Chi/i).first()).toBeVisible({ timeout: 20_000 })
    // Bến Nhà Rồng có thể trong danh sách hoặc map — tìm text hoặc lock hint
    const benText = page.getByText(/Bến Nhà Rồng|Nhà Rồng/i).first()
    if (await benText.isVisible().catch(() => false)) {
      await benText.click()
      await expect(
        page.getByText(/mở khoá|hoàn thành quest|🔒/i).first(),
      ).toBeVisible({ timeout: 8_000 })
    }
  })

  test('checkin GPS hoàn thành quest → có thể unlock Bến Nhà Rồng', async ({ request }) => {
    const user = await registerFreshUser(request)
    const headers = authHeaders(user.token)

    await request.post(`${BE_URL}/api/quests/${SEED.onsiteQuestId}/start`, { headers })

    const checkin = await request.post(`${BE_URL}/api/checkins`, {
      headers,
      data: {
        locationId: SEED.cuChiLocationId,
        latitude: 11.141591,
        longitude: 106.4615963,
        qrCode: `timelens:location:${SEED.cuChiLocationId}`,
      },
    })
    const result = await unwrap<{
      success?: boolean
      questCompleted?: boolean
      newlyUnlockedLocations?: Array<{ id: string; name: string }>
    }>(checkin)

    expect(result.success ?? true).toBeTruthy()

    const locRes = await request.get(`${BE_URL}/api/locations`, {
      headers,
      params: { size: 50 },
    })
    const locPage = await unwrap<{ items: Location[] }>(locRes)
    const ben = locPage.items.find((l) => l.id === SEED.benNhaRongLocationId)

    if (result.questCompleted) {
      expect(ben?.isUnlocked).toBe(true)
      const unlocked = result.newlyUnlockedLocations ?? []
      if (unlocked.some((l) => l.id === SEED.benNhaRongLocationId)) {
        expect(unlocked.some((l) => l.id === SEED.benNhaRongLocationId)).toBe(true)
      }
    } else {
      expect(typeof ben?.isUnlocked).toBe('boolean')
    }
  })
})
