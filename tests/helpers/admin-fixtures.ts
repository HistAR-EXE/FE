import { expect, type Page } from '@playwright/test'
import { SEED, STORAGE_KEYS } from './constants'

export const DISPOSABLE_ADMIN = {
  userId: 'histar-e2e-admin',
  displayName: 'E2E Admin',
  email: 'histar-e2e-admin@example.invalid',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoaXN0YXItZTJlLWFkbWluIiwicm9sZSI6IkFETUlOIiwiZXhwIjo0MDcwOTA4ODAwfQ.e2efakesig',
  locationId: SEED.cuChiLocationId,
  contentId: 'histar-e2e-content',
  questId: 'histar-e2e-narrative',
  paymentId: 'histar-e2e-payment',
}

export const pageResponse = (items: unknown[], totalItems = items.length) => ({
  success: true,
  data: { items, page: 0, size: Math.max(items.length, 20), totalItems, totalPages: totalItems ? 1 : 0 },
})

const graph = {
  startNodeCode: 'start',
  nodes: [
    { code: 'start', type: 'EVIDENCE', title: 'Bắt đầu', prompt: 'Bắt đầu', choices: [], sourceIds: ['source-1'] },
  ],
  evidenceNodeCodes: ['start'],
  outcomeNodeCodes: [],
  sources: [{ sourceId: 'source-1', version: '1', locale: 'vi', citation: 'Nguồn E2E', url: 'https://example.invalid/source' }],
}

export async function seedAdminSession(page: Page, role = 'ADMIN') {
  await page.addInitScript(({ role, storageKeys, token }) => {
    for (const [key, value] of Object.entries({
      [storageKeys.token]: token,
      [storageKeys.userId]: 'histar-e2e-admin',
      [storageKeys.displayName]: role === 'ADMIN' ? 'E2E Admin' : 'E2E User',
      [storageKeys.email]: 'histar-e2e-admin@example.invalid',
      [storageKeys.role]: role,
      [storageKeys.tier]: 'PREMIUM',
      timelens_email_verified: '1',
      [storageKeys.mode]: 'online',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }),
    })) localStorage.setItem(key, value)
  }, { role, storageKeys: STORAGE_KEYS, token: DISPOSABLE_ADMIN.token })
}

export async function mockAdminApi(page: Page, role = 'ADMIN') {
  let narrativeDraft = false
  let narrativeReviewed = false
  let contentDeleted = false

  await page.route((url) => new URL(url).pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } })
    const empty = () => route.fulfill({ json: { success: true, data: [] } })

    if (path === '/api/profile/me') {
      return ok({ id: DISPOSABLE_ADMIN.userId, displayName: DISPOSABLE_ADMIN.displayName, email: DISPOSABLE_ADMIN.email, role, tier: 'PREMIUM', emailVerified: true, orgId: null, orgSubscription: 'NONE' })
    }
    if (path === '/api/admin/dashboard') {
      return ok({ activePilots: 1, draftCount: narrativeDraft ? 0 : 1, reviewPendingCount: narrativeReviewed ? 0 : 1, trashCount: contentDeleted ? 1 : 0, contentReportsLast30Days: 0, openContentReports: 0 })
    }
    if (path === '/api/admin/billing/overview') {
      return ok({ actualRevenueMonthVnd: 100000, monthOverMonthPct: 5, estimatedMrrVnd: 100000, estimatedArrVnd: 1200000, revenueCoveragePct: 100, activePaidSubscriptions: 1, updatedAt: '2026-10-16T00:00:00Z', monthlyRevenue: [], planRevenue: [] })
    }
    if (path === '/api/admin/billing/settings') return ok({ b2cPremiumPriceVnd: 49000, chatFreeDailyLimit: 10, orgVolumeDiscountPercent: 0, orgVolumeDiscountMinLicenses: 1, bankCode: 'E2E', accountNumber: '0', accountName: 'E2E', qrTemplate: '', qrShowInfo: false, updatedAt: null })
    if (path === '/api/admin/billing/payments/export.csv') return route.fulfill({ status: 200, contentType: 'text/csv', body: 'orderCode,channel\nhistar-e2e-payment,SEPAY\n' })
    if (path === '/api/admin/billing/payments') return route.fulfill({ json: pageResponse([{ id: DISPOSABLE_ADMIN.paymentId, orderCode: 'HISTAR-E2E-PAYMENT', amountVnd: 49000, channel: 'SEPAY', status: 'PAID', createdAt: '2026-10-16T00:00:00Z' }]) })
    if (path === '/api/admin/narrative-investigations' && request.method() === 'GET') {
      return route.fulfill({ json: pageResponse([{ questId: DISPOSABLE_ADMIN.questId, questTitle: 'Cốt truyện E2E dùng một lần', investigationId: 'histar-e2e-investigation', locationId: DISPOSABLE_ADMIN.locationId, locationName: 'Địa điểm E2E', reviewStatus: narrativeReviewed ? 'APPROVED' : 'DRAFT', rolloutState: 'NOT_RELEASED', publishedVersion: null, draftVersion: narrativeDraft ? 1 : null, draftReviewStatus: narrativeReviewed ? 'APPROVED' : 'DRAFT', rowVersion: 1, globalFlagEnabled: true }]) })
    }
    if (path === `/api/admin/narrative-investigations/${DISPOSABLE_ADMIN.questId}`) return ok({ questId: DISPOSABLE_ADMIN.questId, questTitle: 'Cốt truyện E2E dùng một lần', investigationId: 'histar-e2e-investigation', locationId: DISPOSABLE_ADMIN.locationId, locationName: 'Địa điểm E2E', reviewStatus: narrativeReviewed ? 'APPROVED' : 'DRAFT', rolloutState: 'NOT_RELEASED', publishedVersion: null, draftVersion: narrativeDraft ? 1 : null, rowVersion: 1, globalFlagEnabled: true, published: null, draft: narrativeDraft ? { version: 1, revision: 1, rowVersion: 1, reviewStatus: narrativeReviewed ? 'APPROVED' : 'DRAFT', approvedLocales: narrativeReviewed ? ['vi'] : [], graph } : null })
    if (path.endsWith('/readiness')) return ok({ questId: DISPOSABLE_ADMIN.questId, draftVersion: narrativeDraft ? 1 : null, ready: narrativeReviewed, globalFlagEnabled: true, items: [{ code: 'FEATURE_FLAG', passed: true, message: 'Cờ E2E bật' }, { code: 'REVIEW_APPROVED', passed: narrativeReviewed, message: narrativeReviewed ? 'Đã duyệt' : 'Chưa duyệt' }] })
    if (path.endsWith('/drafts') && request.method() === 'POST') { narrativeDraft = true; return ok({}) }
    if (path.endsWith('/reviews') && request.method() === 'POST') { narrativeReviewed = true; return ok({}) }
    if (path === '/api/admin/discovery-points') return route.fulfill({ json: pageResponse(contentDeleted ? [] : [{ id: DISPOSABLE_ADMIN.contentId, locationId: DISPOSABLE_ADMIN.locationId, name: 'Nội dung E2E dùng một lần', unlockKey: 'e2e:seed', sortOrder: 1, rowVersion: 1, mapXPct: 10, mapYPct: 10, yaw: 0, pitch: 0 }]) })
    if (path.endsWith('/delete-impact')) return ok({ resourceType: 'DISCOVERY_POINT', resourceId: DISPOSABLE_ADMIN.contentId, deletable: true, blockers: [], warnings: [] })
    if (request.method() === 'DELETE' && path === `/api/admin/discovery-points/${DISPOSABLE_ADMIN.contentId}`) { contentDeleted = true; return ok(null) }
    if (path === '/api/admin/trash') return route.fulfill({ json: pageResponse(contentDeleted ? [{ resourceType: 'DISCOVERY_POINT', id: DISPOSABLE_ADMIN.contentId, name: 'Nội dung E2E dùng một lần', deletedBy: DISPOSABLE_ADMIN.userId, deleteReason: 'Nguồn E2E dùng một lần', deletedAt: '2026-10-16T00:00:00Z', rowVersion: 2 }] : []) })
    if (path.endsWith('/restore') && request.method() === 'POST') { contentDeleted = false; return ok(null) }
    if (path === '/api/admin/audit') return route.fulfill({ json: pageResponse([{ id: 'histar-e2e-audit', actorId: DISPOSABLE_ADMIN.userId, entityType: 'DISCOVERY_POINT', entityId: DISPOSABLE_ADMIN.contentId, action: contentDeleted ? 'SOFT_DELETE' : 'RESTORE', occurredAt: '2026-10-16T00:00:00Z' }]) })
    if (path === '/api/admin/audit/export.json') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'histar-e2e-audit' }]) })
    if (path.includes('/locations/')) return ok([{ id: DISPOSABLE_ADMIN.locationId, name: 'Địa điểm E2E', city: 'E2E' }])
    if (path.includes('/analytics/') || path.includes('/content-reports') || path.includes('/users') || path.includes('/organizations') || path.includes('/b2b2c-inquiries')) return empty()
    return empty()
  })
}

export async function expectAdminPage(page: Page, title: string) {
  await expect(page).toHaveURL(/\/admin(?:\/|$)/)
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
}
