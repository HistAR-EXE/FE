import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { getAlreadyLoggedInRedirect, getPostLoginRedirect } from '../src/shared/auth/types.ts'
import { getAccessTokenExpiryState } from '../src/shared/auth/sessionTiming.ts'

const adminUser = {
  id: 'admin-1',
  displayName: 'Quản trị viên',
  email: 'admin@example.com',
  role: 'ADMIN',
  tier: 'FREE',
  orgId: null,
  orgSubscription: 'NONE',
  avatarUrl: null,
  emailVerified: true,
}

class MemoryStorage {
  #values = new Map()

  getItem(key) { return this.#values.get(key) ?? null }
  setItem(key, value) { this.#values.set(key, String(value)) }
}

test('authenticated administrators land on the admin dashboard', () => {
  assert.equal(getPostLoginRedirect(adminUser), '/admin')
  assert.equal(getAlreadyLoggedInRedirect(adminUser), '/admin')
})

test('the admin CMS entry point uses the canonical /admin route', () => {
  assert.equal(getPostLoginRedirect({ ...adminUser, role: 'ADMIN' }), '/admin')
})

test('admin shell exposes the approved Vietnamese information architecture', async () => {
  const source = await readFile(new URL('../src/components/admin/AdminConsoleLayout.tsx', import.meta.url), 'utf8')
  const expected = [
    ['Tổng quan', '/admin'],
    ['Bàn điều hành', '/admin'],
    ['Vận hành', '/admin/content'],
    ['Nội dung', '/admin/content'],
    ['Pilot cốt truyện', '/admin/narrative-pilots'],
    ['Thùng rác', '/admin/trash'],
    ['Khách hàng & doanh thu', '/admin/users'],
    ['Người dùng', '/admin/users'],
    ['Tổ chức', '/admin/organizations'],
    ['Thanh toán & CRM', '/admin/billing'],
    ['Giám sát', '/admin/analytics'],
    ['Phân tích', '/admin/analytics'],
    ['Nhật ký kiểm toán', '/admin/audit'],
  ]

  for (const [label, route] of expected) {
    assert.match(source, new RegExp(`['\"]${label.replace(/[&]/g, '\\&')}['\"]`))
    assert.match(source, new RegExp(route.replaceAll('/', '\\/')))
  }
  for (const englishLabel of ['Narrative pilots', 'Billing', 'Analytics', 'Audit']) {
    assert.doesNotMatch(source, new RegExp(`>${englishLabel}<|['\"]${englishLabel}['\"]`))
  }
})

test('admin shell leaves the single h1 to each page and supplies breadcrumbs', async () => {
  const shell = await readFile(new URL('../src/components/admin/AdminConsoleLayout.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(shell, /<h1\b/)
  assert.doesNotMatch(shell, /eyebrow/i)
  assert.match(shell, /aria-label="Đường dẫn điều hướng"/)

  const pages = [
    'AdminDashboardPage.tsx',
    'AdminContentPage.tsx',
    'AdminNarrativePilotsPage.tsx',
    'AdminTrashPage.tsx',
    'AdminUsersPage.tsx',
    'AdminOrganizationsPage.tsx',
    'AdminBillingPage.tsx',
    'AdminAnalyticsPage.tsx',
    'AdminAuditPage.tsx',
  ]
  for (const page of pages) {
    const source = await readFile(new URL(`../src/pages/${page}`, import.meta.url), 'utf8')
    const pageHeadings = (source.match(/<h1\b|<AdminPageHeader\b/g) ?? []).length
    assert.equal(pageHeadings, 1, `${page} must own exactly one h1`)
  }
})

test('trash badge uses the existing dashboard API and omits a fake zero on failure', async () => {
  const source = await readFile(new URL('../src/components/admin/AdminConsoleLayout.tsx', import.meta.url), 'utf8')
  assert.match(source, /adminApi\.dashboardSummary\(\)/)
  assert.match(source, /trashCount\s*!==\s*null/)
  assert.doesNotMatch(source, /useState\s*\(\s*0\s*\)/)
})

test('session expiry state is based only on stored token timing', () => {
  const storage = new MemoryStorage()
  assert.deepEqual(getAccessTokenExpiryState(storage, 1_000), { expiresAt: null, remainingMs: null, expiringSoon: false })

  storage.setItem('timelens_token_issued_at', '1000')
  storage.setItem('timelens_token_expires_in', '120')
  assert.deepEqual(getAccessTokenExpiryState(storage, 61_000), {
    expiresAt: 121_000,
    remainingMs: 60_000,
    expiringSoon: true,
  })
})

test('admin dialog implements keyboard, focus return, scroll lock, and inert background behavior', async () => {
  const source = await readFile(new URL('../src/components/admin/AdminModal.tsx', import.meta.url), 'utf8')
  for (const marker of [
    "event.key === 'Escape'",
    "event.key !== 'Tab'",
    'previouslyFocused?.focus()',
    'document.body.style.overflow',
    "setAttribute('inert', '')",
    "removeAttribute('inert')",
  ]) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('shared admin primitives expose accessible states, controls, and chart alternatives', async () => {
  const files = await Promise.all([
    '../src/components/admin/AdminAsyncState.tsx',
    '../src/components/admin/AdminStatusBadge.tsx',
    '../src/components/admin/AdminToolbar.tsx',
    '../src/components/admin/AdminChart.tsx',
    '../src/components/admin/adminChartMotion.ts',
    '../src/components/admin/FormField.tsx',
  ].map((path) => readFile(new URL(path, import.meta.url), 'utf8')))
  const source = files.join('\n')
  for (const marker of ['role="status"', 'role="alert"', 'aria-live', 'aria-label', 'aria-invalid', 'aria-describedby', '<table', 'prefers-reduced-motion']) {
    assert.match(source, new RegExp(marker))
  }
})
