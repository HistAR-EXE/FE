import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'

/**
 * Tầng 1 · LUỒNG 9 (Profile & Gamification) + LUỒNG 11 (Secret Story gate).
 */
test.describe('BE API · Gamification', () => {
  test('LUỒNG 9: profile/me có level được tính từ XP (hệ 5 cấp)', async ({ request }) => {
    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(s.token) })
    const p = await unwrap<{ level: number; levelName?: string; totalPoints: number }>(res)
    expect(p.level).toBeGreaterThanOrEqual(1)
    expect(p.level).toBeLessThanOrEqual(5)
    expect(p.totalPoints).toBeGreaterThanOrEqual(0)
  })

  test('LUỒNG 9: leaderboard public, có entries xếp hạng', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/leaderboard`)
    const data = await unwrap<{ entries: Array<{ rank: number; userId: string; displayName: string }> }>(res)
    expect(Array.isArray(data.entries)).toBeTruthy()
    if (data.entries.length > 1) {
      expect(data.entries[0].rank).toBeLessThanOrEqual(data.entries[1].rank)
    }
  })

  test('LUỒNG 11: secret-story yêu cầu JWT và phản hồi trạng thái gate rõ ràng', async ({ request }) => {
    const noAuth = await request.get(`${BE_URL}/api/locations/${SEED.denHungLocationId}/secret-story`, {
      failOnStatusCode: false,
    })
    expect(noAuth.status()).toBe(401)

    const s = await login(request)
    const res = await request.get(`${BE_URL}/api/locations/${SEED.denHungLocationId}/secret-story`, {
      headers: authHeaders(s.token),
      failOnStatusCode: false,
    })
    // Gate hợp lệ: hoặc 403 (chưa đủ điều kiện) hoặc 200 với cờ locked rõ ràng
    if (res.status() === 200) {
      const data = await unwrap<{ locked: boolean }>(res)
      expect(typeof data.locked).toBe('boolean')
    } else {
      expect(res.status()).toBe(403)
    }
  })
})
