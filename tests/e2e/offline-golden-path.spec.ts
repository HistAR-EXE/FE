import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { registerFreshUser, authHeaders, unwrap } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('E2E · Offline golden path', () => {
  test('GP-H2: offline scan → checkin API → quest badge', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'offline' })

    await page.goto('/scan')
    await expect(page.getByText(/Quét|Check-in|Nhập Mã/i).first()).toBeVisible({ timeout: 15_000 })

    await request.post(`${BE_URL}/api/quests/${SEED.onsiteQuestId}/start`, {
      headers: authHeaders(user.token),
    })
    const checkin = await request.post(`${BE_URL}/api/checkins`, {
      headers: authHeaders(user.token),
      data: {
        locationId: SEED.cuChiLocationId,
        latitude: 11.141591,
        longitude: 106.4615963,
        qrCode: `timelens:location:${SEED.cuChiLocationId}`,
      },
    })
    expect(checkin.ok()).toBeTruthy()

    await page.goto(`/quests?locationId=${SEED.cuChiLocationId}`)
    await expect(page.getByText(/Cần đến tận nơi/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
