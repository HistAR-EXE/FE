import { expect, test } from '@playwright/test'
import { ADMIN_USER, SEED } from '../helpers/constants'
import { authHeaders, login } from '../helpers/api'

const contentType = process.env.HISTAR_E2E_CONTENT_TYPE ?? 'DISCOVERY_POINT'
const contentId = process.env.HISTAR_E2E_CONTENT_ID
const contentRowVersion = Number(process.env.HISTAR_E2E_CONTENT_ROW_VERSION ?? '1')
const narrativeQuestId = process.env.HISTAR_E2E_NARRATIVE_QUEST_ID ?? SEED.narrativePilotQuestId

test.describe('disposable seeded admin API', () => {
  test.skip(!process.env.HISTAR_E2E_ADMIN_TOKEN && !process.env.HISTAR_E2E_ADMIN_PASSWORD, 'Set HISTAR_E2E_ADMIN_TOKEN or HISTAR_E2E_ADMIN_PASSWORD for the disposable seeded backend gate.')

  async function getToken(request: Parameters<typeof login>[0]) {
    if (process.env.HISTAR_E2E_ADMIN_TOKEN) return process.env.HISTAR_E2E_ADMIN_TOKEN
    const session = await login(request, { email: process.env.HISTAR_E2E_ADMIN_EMAIL ?? ADMIN_USER.email, password: process.env.HISTAR_E2E_ADMIN_PASSWORD as string })
    return session.token
  }

  test('admin dashboard and payment channel/export routes are available', async ({ request }) => {
    const headers = authHeaders(await getToken(request))
    const dashboard = await request.get('/api/admin/dashboard', { headers })
    expect(dashboard.ok()).toBe(true)
    const payments = await request.get('/api/admin/billing/payments', { headers, params: { channel: 'B2C', page: 0, size: 20 } })
    expect(payments.ok()).toBe(true)
    const exportResponse = await request.get('/api/admin/billing/payments/export.csv', { headers, params: { channel: 'B2C' } })
    expect(exportResponse.ok()).toBe(true)
    expect(exportResponse.headers()['content-type']).toContain('text/csv')
  })

  test('narrative workflow exposes detail, readiness, review, rollout, and audit contracts', async ({ request }) => {
    const headers = authHeaders(await getToken(request))
    for (const path of [
      `/api/admin/narrative-investigations/${narrativeQuestId}`,
      `/api/admin/narrative-investigations/${narrativeQuestId}/readiness`,
      `/api/admin/narrative-investigations/${narrativeQuestId}/audit`,
    ]) {
      expect((await request.get(path, { headers })).ok()).toBe(true)
    }
  })

  test('seeded content supports soft-delete, trash visibility, restore, and audit', async ({ request }) => {
    test.skip(!contentId, 'Set HISTAR_E2E_CONTENT_ID for the disposable seeded content.')
    const headers = authHeaders(await getToken(request))
    const deleteResponse = await request.delete(`/api/admin/${contentType.toLowerCase().replace('_point', '-points')}/${contentId}`, { headers, data: { reasonPreset: 'Khác', reason: 'Nguồn E2E dùng một lần', rowVersion: contentRowVersion, idempotencyKey: `histar-e2e-${Date.now()}` } })
    expect(deleteResponse.ok()).toBe(true)
    const trash = await request.get('/api/admin/trash', { headers, params: { q: contentId } })
    expect(trash.ok()).toBe(true)
    const restore = await request.post(`/api/admin/${contentType.toLowerCase().replace('_point', '-points')}/${contentId}/restore`, { headers, data: { rowVersion: contentRowVersion + 1, reason: 'Khôi phục E2E dùng một lần', idempotencyKey: `histar-e2e-restore-${Date.now()}` } })
    expect(restore.ok()).toBe(true)
    const audit = await request.get('/api/admin/audit', { headers, params: { entityId: contentId } })
    expect(audit.ok()).toBe(true)
  })
})
