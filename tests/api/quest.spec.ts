import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'

type Quest = {
  id: string
  locationId: string
  title: string
  requireOnsiteCheckin?: boolean
  completionTrigger?: string
}

/**
 * Tầng 1 · LUỒNG 5 (Quest Engine) — BR-10, BR-11, BR-12, AC-4, AC-5.
 */
test.describe('BE API · Quest', () => {
  test('LUỒNG 5: GET /api/quests public, mỗi quest có field requireOnsiteCheckin (BR-12)', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/quests`, { params: { size: 50 } })
    const page = await unwrap<{ items: Quest[] }>(res)
    expect(page.items.length).toBeGreaterThan(0)
    for (const q of page.items) {
      expect(typeof q.requireOnsiteCheckin, `quest "${q.title}" phải khai báo requireOnsiteCheckin`).toBe('boolean')
    }
  })

  test('BR-11: quest Củ Chi bắt buộc onsite (requireOnsiteCheckin=true)', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/quests`, { params: { size: 50 } })
    const page = await unwrap<{ items: Quest[] }>(res)
    const onsite = page.items.find((q) => q.id === SEED.onsiteQuestId)
    expect(onsite, 'phải tồn tại quest Củ Chi onsite').toBeTruthy()
    expect(onsite?.requireOnsiteCheckin).toBe(true)
  })

  test('BR-10: tồn tại quest heritage remote-friendly (requireOnsiteCheckin=false)', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/quests`, { params: { size: 50 } })
    const page = await unwrap<{ items: Quest[] }>(res)
    const remote = page.items.filter((q) => q.requireOnsiteCheckin === false)
    expect(remote.length, 'phải có ít nhất 1 quest hoàn thành được từ xa').toBeGreaterThan(0)
  })

  test('LUỒNG 5: /api/me/quests yêu cầu JWT', async ({ request }) => {
    const noAuth = await request.get(`${BE_URL}/api/me/quests`, { failOnStatusCode: false })
    expect(noAuth.status()).toBe(401)

    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/me/quests`, {
      headers: authHeaders(s.token),
      params: { size: 50 },
    })
    const page = await unwrap<{ items: unknown[] }>(res)
    expect(Array.isArray(page.items)).toBeTruthy()
  })
})
