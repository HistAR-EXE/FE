import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { unwrap } from '../helpers/api'

/**
 * Tầng 1 · LUỒNG 2 (Explore & Map) + LUỒNG 8 (Character) — BR-04, BR-13.
 * Nội dung marketing/SEO phải public GET (không gate).
 */
test.describe('BE API · Explore & Content (public)', () => {
  test('BR-04: GET /api/locations public, có items', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/locations`)
    const page = await unwrap<{ items: Array<{ id: string; name: string }> }>(res)
    expect(Array.isArray(page.items)).toBeTruthy()
    expect(page.items.length).toBeGreaterThan(0)
  })

  test('BR-04: GET /api/locations/{id} trả chi tiết Củ Chi', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/locations/${SEED.cuChiLocationId}`)
    const loc = await unwrap<{ id: string; name: string }>(res)
    expect(loc.id).toBe(SEED.cuChiLocationId)
    expect(loc.name).toBeTruthy()
  })

  test('BR-13: characters gắn theo location, public GET', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/characters/by-location/${SEED.cuChiLocationId}`)
    const chars = await unwrap<Array<{ id: string; locationId: string }>>(res)
    expect(Array.isArray(chars)).toBeTruthy()
    for (const c of chars) expect(c.locationId).toBe(SEED.cuChiLocationId)
  })

  test('location không tồn tại → 404', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/locations/00000000-0000-0000-0000-000000000000`, {
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(404)
  })
})
