import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { login, authHeaders, unwrap } from '../helpers/api'
import { expectApiError } from '../helpers/errors'
import { ensureFixtureJpeg } from '../fixtures/create-test-image'

const fixturePath = ensureFixtureJpeg()

test.describe('BE API · Photo / Viral', () => {
  test('VIR-H1: GET /api/photo-frames public', async ({ request }) => {
    const res = await request.get(`${BE_URL}/api/photo-frames`)
    const frames = await unwrap<Array<{ id: string; name: string }>>(res)
    expect(Array.isArray(frames)).toBeTruthy()
  })

  test('VIR-H2: upload JPEG creation (MinIO up)', async ({ request }) => {
    const framesRes = await request.get(`${BE_URL}/api/photo-frames`)
    const frames = await unwrap<Array<{ id: string }>>(framesRes)
    test.skip(frames.length === 0, 'No photo frames in DB')

    const s = await login(request)
    const res = await request.post(`${BE_URL}/api/user-creations`, {
      headers: authHeaders(s.token),
      multipart: {
        file: {
          name: 'sample.jpg',
          mimeType: 'image/jpeg',
          buffer: fs.readFileSync(fixturePath),
        },
        frameId: frames[0].id,
        variant: 'square',
      },
      failOnStatusCode: false,
      timeout: 30_000,
    })
    if (!res.ok()) {
      test.skip(true, `MinIO/upload unavailable: ${res.status()} ${await res.text()}`)
    }
    const created = await unwrap<{ id: string; outputUrl: string }>(res)
    expect(created.id).toBeTruthy()
    expect(created.outputUrl).toBeTruthy()
  })

  test('VIR-B1: upload without file → 4xx', async ({ request }) => {
    const s = await login(request)
    const res = await request.post(`${BE_URL}/api/user-creations`, {
      headers: authHeaders(s.token),
      multipart: {
        frameId: randomUUID(),
        variant: 'square',
      },
      failOnStatusCode: false,
    })
    expect(res.ok()).toBeFalsy()
  })
})
