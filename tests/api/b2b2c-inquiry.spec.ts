import { test, expect } from '@playwright/test'
import { ADMIN_USER, BE_URL } from '../helpers/constants'
import { authHeaders, login, registerFreshUser, unwrap } from '../helpers/api'

test.describe('BE API · B2B2C inquiry', () => {
  test('B2B2C-API-H01: submit inquiry happy path', async ({ request }) => {
    const user = await registerFreshUser(request)
    const data = await unwrap<{ id: string; status: string }>(
      await request.post(`${BE_URL}/api/billing/b2b2c-inquiry`, {
        headers: authHeaders(user.token),
        data: {
          siteName: `Di tich E2E ${Date.now()}`,
          contactName: 'Nguyen Van A',
          contactEmail: `b2b2c_${Date.now()}@histar.vn`,
          contactPhone: '0901234567',
          packageType: 'ONE_TIME',
          message: 'Can so hoa di tich Củ Chi',
        },
      }),
    )
    expect(data.id).toBeTruthy()
    expect(data.status).toBeTruthy()
  })

  test('B2B2C-API-B01: missing required fields returns 4xx', async ({ request }) => {
    const user = await registerFreshUser(request)
    const res = await request.post(`${BE_URL}/api/billing/b2b2c-inquiry`, {
      headers: authHeaders(user.token),
      data: {
        siteName: '',
        contactName: '',
        contactEmail: 'not-an-email',
        packageType: 'INVALID',
      },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('B2B2C-API-H02: admin can list inquiries', async ({ request }) => {
    const user = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/b2b2c-inquiry`, {
        headers: authHeaders(user.token),
        data: {
          siteName: `List Probe ${Date.now()}`,
          contactName: 'Admin Probe',
          contactEmail: `list_${Date.now()}@histar.vn`,
          packageType: 'OPEX',
        },
      }),
    )
    const admin = await login(request, ADMIN_USER)
    const list = await unwrap<Array<{ id: string }>>(
      await request.get(`${BE_URL}/api/billing/admin/b2b2c-inquiries`, {
        headers: authHeaders(admin.token),
      }),
    )
    expect(Array.isArray(list)).toBeTruthy()
    expect(list.length).toBeGreaterThan(0)
  })
})
