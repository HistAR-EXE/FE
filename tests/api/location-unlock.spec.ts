import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'

type Location = {
  id: string
  name: string
  unlockPrerequisiteQuestId?: string | null
  unlockNarrative?: string | null
  isUnlocked?: boolean | null
}

/**
 * FR-15 · Location unlock progression (Củ Chi → Bến Nhà Rồng demo pair).
 */
test.describe('BE API · Location unlock', () => {
  test('GET /api/locations public trả unlockPrerequisiteQuestId metadata', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/locations`, { params: { size: 50 } })
    const page = await unwrap<{ items: Location[] }>(res)
    const benNhaRong = page.items.find((l) => l.id === SEED.benNhaRongLocationId)
    expect(benNhaRong, 'Bến Nhà Rồng phải có trong seed').toBeTruthy()
    expect(benNhaRong?.unlockPrerequisiteQuestId).toBe(SEED.onsiteQuestId)
    expect(benNhaRong?.unlockNarrative).toBeTruthy()
  })

  test('GET /api/locations với JWT trả isUnlocked per user', async ({ request }) => {
    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/locations`, {
      headers: authHeaders(s.token),
      params: { size: 50 },
    })
    const page = await unwrap<{ items: Location[] }>(res)
    const cuChi = page.items.find((l) => l.id === SEED.cuChiLocationId)
    const benNhaRong = page.items.find((l) => l.id === SEED.benNhaRongLocationId)
    expect(cuChi?.isUnlocked).toBe(true)
    expect(typeof benNhaRong?.isUnlocked).toBe('boolean')
  })

  test('GET /api/admin/locations/{id}/era-count (ADMIN)', async ({ request }) => {
    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/admin/locations/${SEED.cuChiLocationId}/era-count`, {
      headers: authHeaders(s.token),
    })
    const body = await unwrap<{ eraCount: number; sufficient: boolean }>(res)
    expect(body.eraCount).toBeGreaterThanOrEqual(0)
    expect(typeof body.sufficient).toBe('boolean')
  })
})
