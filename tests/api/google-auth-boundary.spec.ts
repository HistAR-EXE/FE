import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { loadContract } from '../helpers/contracts'

type GoogleInvalidFixture = {
  request: { idToken: string }
  expectedStatusMin: number
  expectedMessagePattern: string
}

/**
 * AUTH-G01 boundary — mock/token validation without browser popup.
 * Full popup flow remains optional via GOOGLE_TEST_ID_TOKEN (AUTH-G10).
 */
test.describe('BE API · Google OAuth boundary (AUTH-G01 mock)', () => {
  test('AUTH-G01: invalid token matches contract fixture response shape', async ({ request }) => {
    const fixture = loadContract<GoogleInvalidFixture>('google-invalid-token.json')
    const res = await request.post(`${BE_URL}/api/auth/google`, {
      data: fixture.request,
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(fixture.expectedStatusMin)
    const body = (await res.json()) as { message?: string; success?: boolean }
    const msg = (body.message ?? JSON.stringify(body)).toLowerCase()
    expect(msg).toMatch(new RegExp(fixture.expectedMessagePattern, 'i'))
  })

  test('AUTH-G01: empty token rejected (boundary with G02)', async ({ request }) => {
    const res = await request.post(`${BE_URL}/api/auth/google`, {
      data: { idToken: '' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })
})
