import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import * as adminState from '../src/features/admin/state.ts'
import {
  buildAdminListSearchParams,
  formatSuppressedMetric,
  parseAdminListState,
  validateDeleteReason,
} from '../src/features/admin/state.ts'

class MemoryStorage {
  #values = new Map()

  get length() { return this.#values.size }
  clear() { this.#values.clear() }
  getItem(key) { return this.#values.get(key) ?? null }
  key(index) { return [...this.#values.keys()][index] ?? null }
  removeItem(key) { this.#values.delete(key) }
  setItem(key, value) { this.#values.set(key, String(value)) }
}

test('admin list state clamps invalid URL values and preserves supported filters', () => {
  const state = parseAdminListState(
    new URLSearchParams('page=-5&size=500&q=%20cu%20chi%20&type=QUEST&sort=deletedAt,asc'),
  )

  assert.deepEqual(state, {
    page: 0,
    size: 100,
    q: 'cu chi',
    type: 'QUEST',
    sort: 'deletedAt,asc',
  })
})

test('admin list query omits defaults and writes the visible one-based page', () => {
  const params = buildAdminListSearchParams({
    page: 2,
    size: 20,
    q: 'artifact',
    type: '',
    sort: 'occurredAt,desc',
  })

  assert.equal(params.toString(), 'page=3&q=artifact&sort=occurredAt%2Cdesc')
})

test('custom delete reason requires at least ten non-whitespace characters', () => {
  assert.equal(validateDeleteReason('Sai nguồn', ''), null)
  assert.match(validateDeleteReason('Khác', 'quá ngắn') ?? '', /10 ký tự/)
  assert.equal(validateDeleteReason('Khác', 'Nguồn trích dẫn sai'), null)
})

test('suppressed analytics never exposes the underlying small count', () => {
  assert.equal(formatSuppressedMetric(7, true), 'Ẩn (<10 mẫu)')
  assert.equal(formatSuppressedMetric(12, false), '12')
  assert.equal(adminState.formatSuppressedCount(7, false), 'Ẩn (<10 mẫu)')
  assert.equal(adminState.formatSuppressedCount(10, false), '10')
  assert.equal(adminState.formatSuppressedCount(null, true), 'Ẩn (<10 mẫu)')
})

test('admin draft storage is scoped by user, route, and form and can be cleared after success', () => {
  const storage = new MemoryStorage()
  const draft = { name: 'Địa đạo', sortOrder: '2' }

  adminState.writeAdminDraft(storage, 'user-a', '/admin/content', 'discovery:create', draft)

  assert.deepEqual(adminState.readAdminDraft(storage, 'user-a', '/admin/content', 'discovery:create'), draft)
  assert.equal(adminState.readAdminDraft(storage, 'user-b', '/admin/content', 'discovery:create'), null)
  assert.equal(adminState.readAdminDraft(storage, 'user-a', '/admin/billing', 'discovery:create'), null)

  adminState.clearAdminDraft(storage, 'user-a', '/admin/content', 'discovery:create')
  assert.equal(adminState.readAdminDraft(storage, 'user-a', '/admin/content', 'discovery:create'), null)
})

test('admin draft storage strips tokens, files, and sensitive inquiry notes', () => {
  const storage = new MemoryStorage()
  const fileLike = { name: 'private.png', size: 42, type: 'image/png', arrayBuffer() {} }

  adminState.writeAdminDraft(storage, 'user-a', '/admin/billing', 'inquiry:lead-1:status', {
    status: 'CONTACTED',
    accessToken: 'access-secret',
    refresh_token: 'refresh-secret',
    file: fileLike,
    adminNotes: 'private CRM note',
    nested: { token: 'nested-secret', safe: 'kept' },
  })

  assert.deepEqual(
    adminState.readAdminDraft(storage, 'user-a', '/admin/billing', 'inquiry:lead-1:status'),
    { status: 'CONTACTED', nested: { safe: 'kept' } },
  )
})

test('draft preservation is limited to unauthorized responses', () => {
  assert.equal(adminState.shouldPreserveAdminDraft({ status: 401 }), true)
  assert.equal(adminState.shouldPreserveAdminDraft({ status: 403 }), false)
  assert.equal(adminState.shouldPreserveAdminDraft(new Error('offline')), false)
})

test('user change cleanup removes only the previous user admin drafts', () => {
  const storage = new MemoryStorage()
  adminState.writeAdminDraft(storage, 'user-a', '/admin/content', 'quest:create', { title: 'A' })
  adminState.writeAdminDraft(storage, 'user-b', '/admin/content', 'quest:create', { title: 'B' })

  adminState.clearAdminDraftsForUser(storage, 'user-a')

  assert.equal(adminState.readAdminDraft(storage, 'user-a', '/admin/content', 'quest:create'), null)
  assert.deepEqual(adminState.readAdminDraft(storage, 'user-b', '/admin/content', 'quest:create'), { title: 'B' })
})

test('latest request guard rejects stale completions', () => {
  const guard = adminState.createLatestRequestGuard()
  const first = guard.begin()
  const second = guard.begin()

  assert.equal(first.isLatest(), false)
  assert.equal(second.isLatest(), true)
  guard.invalidate()
  assert.equal(second.isLatest(), false)
})

test('admin pages integrate draft, request ordering, and URL synchronization helpers', async () => {
  const [content, billing, trash, audit] = await Promise.all([
    readFile(new URL('../src/pages/AdminContentPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AdminBillingPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AdminTrashPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AdminAuditPage.tsx', import.meta.url), 'utf8'),
  ])

  for (const helper of ['readAdminDraft', 'writeAdminDraft', 'clearAdminDraft', 'shouldPreserveAdminDraft']) {
    assert.match(content, new RegExp(`\\b${helper}\\b`))
    assert.match(billing, new RegExp(`\\b${helper}\\b`))
  }
  for (const page of [content, trash, audit]) {
    assert.match(page, /createLatestRequestGuard/)
    assert.match(page, /\.isLatest\(\)/)
  }
  assert.match(trash, /setSearch\(state\.q\)/)
})

test('narrative pilot filters round-trip search, page, review, and rollout state', () => {
  const state = adminState.parseNarrativePilotListState(new URLSearchParams(
    'q=cu+chi&page=3&reviewStatus=APPROVED&rolloutState=PAUSED',
  ))

  assert.deepEqual(state, {
    page: 2,
    q: 'cu chi',
    reviewStatus: 'APPROVED',
    rolloutState: 'PAUSED',
  })
  assert.equal(
    adminState.buildNarrativePilotSearchParams(state).toString(),
    'page=3&q=cu+chi&reviewStatus=APPROVED&rolloutState=PAUSED',
  )
})

test('narrative review notes require ten non-whitespace characters', () => {
  assert.match(adminState.validateNarrativeReviewNote('  ngắn  ') ?? '', /10 ký tự/)
  assert.equal(adminState.validateNarrativeReviewNote('Đã kiểm tra nguồn vi'), null)
})

test('narrative graph validation anchors choice and citation errors to fields', () => {
  const errors = adminState.validateNarrativeGraph({
    startNodeCode: 'start',
    nodes: [
      { code: 'start', type: 'EVIDENCE', choices: [{ code: 'Tiếp tục', targetNodeCode: 'missing' }], sourceIds: ['source-missing'] },
    ],
    evidenceNodeCodes: ['start'],
    outcomeNodeCodes: [],
    sources: [{ sourceId: 'source-vi', version: '', locale: 'vi', citation: '', url: '' }],
  })

  assert.equal(errors['nodes.0.choices.0.targetNodeCode'], 'Node đích không tồn tại.')
  assert.equal(errors['nodes.0.sourceIds.0'], 'Source không tồn tại.')
  assert.equal(errors['sources.0.version'], 'Version nguồn là bắt buộc cho locale vi.')
  assert.equal(errors['sources.0.citation'], 'Citation là bắt buộc cho locale vi.')
})

test('narrative audit timeline deduplicates general audit events by id', () => {
  const events = adminState.dedupeNarrativeAuditEvents([
    { id: 'audit-1', occurredAt: '2026-10-14T02:00:00Z' },
    { id: 'audit-1', occurredAt: '2026-10-14T02:00:00Z' },
    { id: 'audit-2', occurredAt: '2026-10-14T03:00:00Z' },
  ])

  assert.deepEqual(events.map((event) => event.id), ['audit-2', 'audit-1'])
})

test('paused published v1 and approved draft v2 expose separate actions', () => {
  assert.deepEqual(adminState.getNarrativeRolloutActions({
    rolloutState: 'PAUSED',
    publishedVersion: 1,
    draftVersion: 2,
    draftReviewStatus: 'APPROVED',
  }), [
    { action: 'resume', label: 'Tiếp tục v1', version: 1 },
    { action: 'publish-draft', label: 'Phát hành v2', version: 2 },
  ])
})

test('narrative admin client and page use the Phase 2 contract and structured tabs', async () => {
  const [api, page] = await Promise.all([
    readFile(new URL('../src/features/admin/api.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AdminNarrativePilotsPage.tsx', import.meta.url), 'utf8'),
  ])

  for (const endpoint of ['/drafts', '/pause', '/resume', '/publish-draft', '/audit']) {
    assert.match(api, new RegExp(endpoint.replace('/', '\\/')))
  }
  assert.match(api, /Idempotency-Key/)
  assert.match(api, /httpClient\.patch\([^\n]+drafts/)
  assert.match(page, /draftVersion\s*==\s*null[\s\S]{0,80}Promise\.resolve\(null\)/)
  assert.match(page, /needsReadiness\s*=\s*action\.action\s*===\s*["']enable["'][\s\S]{0,80}action\.action\s*===\s*["']publish-draft["']/)
  assert.match(page, /publishedReadiness/)
  assert.match(page, /rolloutKeys\.current/)
  for (const tab of ['Readiness', 'Graph', 'Nguồn & citation', 'Reward & ending', 'Lịch sử']) {
    assert.match(page, new RegExp(tab))
  }
  assert.doesNotMatch(page, /Graph JSON draft/)
  for (const helper of ['readAdminDraft', 'writeAdminDraft', 'clearAdminDraft', 'shouldPreserveAdminDraft']) {
    assert.match(page, new RegExp(`\\b${helper}\\b`))
  }
})
