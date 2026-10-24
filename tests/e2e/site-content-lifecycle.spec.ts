import { expect, test, type Page, type Route } from '@playwright/test'
import { STORAGE_KEYS } from '../helpers/constants.ts'

const SITE = 'cu-chi'
const LOCATION_ID = '11111111-1111-1111-1111-111111111111'
const ONBOARDING_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

const ADMIN = actor('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Quản trị E2E', 'admin-e2e@example.invalid', 'ADMIN')
const MANAGER = actor('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Quản lý Củ Chi', 'manager-e2e@example.invalid', 'USER')
const EDITOR = actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Biên tập Củ Chi', 'editor-e2e@example.invalid', 'USER')
const REVIEWER = actor('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Người duyệt Củ Chi', 'reviewer-e2e@example.invalid', 'USER')
const ACTORS = [ADMIN, MANAGER, EDITOR, REVIEWER]

const PRIOR_PROFILE = {
  name: 'Địa đạo Củ Chi',
  description: 'Mô tả công khai trước khi phát hành.',
  formattedAddress: 'Phú Mỹ Hưng, Củ Chi',
  coverImage: 'https://cdn.example/cu-chi-cover.jpg',
  sources: 'Bảo tàng Củ Chi',
}
const NEXT_PROFILE = {
  ...PRIOR_PROFILE,
  name: 'Địa đạo Củ Chi bản E2E',
  description: 'Mô tả công khai sau khi phát hành.',
}
const PRIOR_STATION = {
  name: 'Hầm lối vào bản cũ',
  body: 'Nội dung trạm ST01 trước khi phát hành.',
}
const NEXT_STATION = {
  name: 'Hầm lối vào bản E2E',
  body: 'Nội dung trạm ST01 sau khi phát hành.',
}

type PlatformRole = 'ADMIN' | 'USER'
type SiteRole = 'SITE_MANAGER' | 'CONTENT_EDITOR' | 'CONTENT_REVIEWER'
type ContentKind = 'SITE_PROFILE' | 'STATION'

type Actor = {
  id: string
  token: string
  displayName: string
  email: string
  platformRole: PlatformRole
}

type Member = { userId: string; role: SiteRole; active: boolean }

type Version = {
  id: string
  siteCode: string
  contentKind: ContentKind
  resourceKey: string
  version: number
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED'
  snapshotJson: string
  revision: number
  createdBy: string
  submittedBy: string | null
  reviewedBy: string | null
  publishedBy: string | null
  reviewNote: string | null
}

type AuditEvent = {
  id: string
  actorId: string
  entityType: string
  entityId: string
  action: string
  reason: string | null
  occurredAt: string
}

function actor(id: string, displayName: string, email: string, platformRole: PlatformRole): Actor {
  return { id, token: `site-e2e.${id}`, displayName, email, platformRole }
}

test('site content moves from onboarding through publish and rollback', async ({ page }) => {
  await installLifecycleMock(page)
  await page.goto('/privacy')
  await signIn(page, ADMIN)

  const approved = await page.evaluate(async (id) => {
    const token = localStorage.getItem('timelens_token')
    const response = await fetch(`/api/admin/site-onboarding-requests/${id}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note: 'Đã xác minh đại diện' }),
    })
    return response.json() as Promise<{ success: boolean; data: { status: string; requesterId: string } }>
  }, ONBOARDING_ID)
  expect(approved.success).toBe(true)
  expect(approved.data.status).toBe('APPROVED')
  expect(approved.data.requesterId).toBe(MANAGER.id)

  await signIn(page, MANAGER)
  await page.goto('/site-workspace')
  await expect(page.getByText('Vai trò của bạn: Quản lý di tích')).toBeVisible()
  await page.getByRole('tab', { name: 'Thành viên' }).click()
  await saveMember(page, EDITOR.id, 'Biên tập viên')
  await saveMember(page, REVIEWER.id, 'Người duyệt')
  await expect(page.getByText(EDITOR.id)).toBeVisible()
  await expect(page.getByText(REVIEWER.id)).toBeVisible()

  await signIn(page, EDITOR)
  await page.goto('/site-workspace')
  await expect(page.getByText('Vai trò của bạn: Biên tập viên')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gửi duyệt' })).toBeEnabled()
  await page.getByLabel('Tên di tích').fill(NEXT_PROFILE.name)
  await page.getByLabel('Mô tả').fill(NEXT_PROFILE.description)
  await page.getByRole('button', { name: 'Gửi duyệt' }).click()
  await expect(page.getByText(/Đã gửi duyệt hồ sơ phiên bản 2/)).toBeVisible()

  await page.getByRole('tab', { name: 'Trạm' }).click()
  await expect(page.getByLabel('Tên trạm')).toHaveValue(PRIOR_STATION.name)
  await page.getByLabel('Tên trạm').fill(NEXT_STATION.name)
  await page.getByLabel('Nội dung block').fill(NEXT_STATION.body)
  await page.getByRole('button', { name: 'Gửi duyệt' }).click()
  await expect(page.getByText(/Đã gửi duyệt trạm ST01 phiên bản 2/)).toBeVisible()

  await signIn(page, REVIEWER)
  await page.goto('/site-workspace')
  await expect(page.getByText('Vai trò của bạn: Người duyệt')).toBeVisible()
  await page.getByRole('tab', { name: 'Chờ duyệt' }).click()
  await expect(page.getByRole('button', { name: 'Phát hành' })).toHaveCount(0)
  await approveAsReviewer(page)
  await approveAsReviewer(page)
  await expect(page.getByRole('button', { name: 'Phê duyệt' })).toHaveCount(0)

  await signIn(page, MANAGER)
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Chờ duyệt' }).click()
  await page.getByRole('button', { name: 'Phát hành' }).first().click()
  await expect(page.getByText(/Đã phát hành phiên bản 2/)).toBeVisible()
  await page.getByRole('button', { name: 'Phát hành' }).click()
  await expect(page.getByText(/Đã phát hành phiên bản 2/)).toBeVisible()

  await page.getByRole('tab', { name: 'Đã phát hành' }).click()
  await expect(page).toHaveURL(/\/site-workspace$/)
  await expect(page.getByRole('button', { name: 'Thu hồi hồ sơ di tích' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thu hồi trạm ST01' })).toBeVisible()

  await expectPublic(page, NEXT_PROFILE.name, NEXT_PROFILE.description, NEXT_STATION.name, NEXT_STATION.body)

  await signIn(page, MANAGER)
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Đã phát hành' }).click()
  await rollbackLive(page, 'hồ sơ di tích', 'Thu hồi hồ sơ vì sai mô tả', '/content/SITE_PROFILE/profile/versions/1/rollback')
  await rollbackLive(page, 'trạm ST01', 'Thu hồi trạm ST01 vì sai nội dung', '/content/STATION/ST01/versions/1/rollback')

  await expectPublic(page, PRIOR_PROFILE.name, PRIOR_PROFILE.description, PRIOR_STATION.name, PRIOR_STATION.body)

  await signIn(page, ADMIN)
  const audit = await page.evaluate(async () => {
    const token = localStorage.getItem('timelens_token')
    const response = await fetch('/api/admin/audit?entityType=SITE_CONTENT&action=SITE_CONTENT_ROLLED_BACK', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.json() as Promise<{ data: { items: Array<{ action: string; reason: string | null }> } }>
  })
  expect(audit.data.items.map((item) => item.action)).toEqual(['SITE_CONTENT_ROLLED_BACK', 'SITE_CONTENT_ROLLED_BACK'])
  expect(audit.data.items.map((item) => item.reason)).toEqual([
    'Thu hồi trạm ST01 vì sai nội dung',
    'Thu hồi hồ sơ vì sai mô tả',
  ])
})

async function saveMember(page: Page, userId: string, roleLabel: string) {
  await page.getByLabel('Mã người dùng').fill(userId)
  await page.getByLabel('Vai trò').selectOption({ label: roleLabel })
  await page.getByRole('button', { name: 'Lưu thành viên' }).click()
  await expect(page.getByText('Đã cập nhật thành viên')).toBeVisible()
}

async function approveAsReviewer(page: Page) {
  const review = page.waitForRequest(
    (request) => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/review'),
  )
  await page.getByRole('button', { name: 'Phê duyệt' }).first().click()
  const request = await review
  expect(request.headers().authorization).toBe(`Bearer ${REVIEWER.token}`)
  expect(request.postDataJSON()).toMatchObject({ decision: 'APPROVE', expectedRevision: 2 })
  await expect(page.getByText(/Đã phê duyệt phiên bản 2/)).toBeVisible()
}

async function rollbackLive(page: Page, label: string, reason: string, pathSuffix: string) {
  const pending = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname.endsWith(pathSuffix))
  await page.getByLabel(`Lý do thu hồi ${label}`).fill(reason)
  await page.getByRole('button', { name: `Thu hồi ${label}` }).click()
  const request = await pending
  expect(request.postDataJSON()).toEqual({ reason, expectedRevision: 4 })
  await expect(page.getByText('Đã thu hồi về phiên bản 3 (từ phiên bản 1)')).toBeVisible()
}

async function expectPublic(page: Page, profileName: string, description: string, stationName: string, stationBody: string) {
  const locations = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return response.request().method() === 'GET' && url.pathname === '/api/locations' && response.ok()
  })
  await page.goto('/characters')
  const listed = (await (await locations).json()) as { data: { items: Array<{ name: string; description: string }> } }
  expect(listed.data.items[0]).toMatchObject({ name: profileName, description })
  await expect(page.locator('select option')).toHaveText([profileName])

  await page.goto(`/sites/${SITE}/stations/ST01/media`)
  await expect(page.getByRole('heading', { level: 1, name: stationName })).toBeVisible()
  await expect(page.getByText(stationBody, { exact: true })).toBeVisible()

  const stations = await page.evaluate(async (site) => {
    const response = await fetch(`/api/sites/${site}/stations`)
    return response.json() as Promise<{ data: Array<{ name: string; blocks: Array<{ body: string }> }> }>
  }, SITE)
  expect(stations.data[0]).toMatchObject({ name: stationName, blocks: [{ body: stationBody }] })
}

async function signIn(page: Page, person: Actor) {
  await page.evaluate(({ person, storageKeys }) => {
    const entries: Record<string, string> = {
      [storageKeys.token]: person.token,
      [storageKeys.userId]: person.id,
      [storageKeys.displayName]: person.displayName,
      [storageKeys.email]: person.email,
      [storageKeys.role]: person.platformRole,
      [storageKeys.tier]: 'PREMIUM',
      timelens_email_verified: '1',
      [storageKeys.mode]: 'online',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }),
      sidenav_collapsed: 'false',
    }
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
  }, { person, storageKeys: STORAGE_KEYS })
}

async function installLifecycleMock(page: Page) {
  const profileV1 = versionRow('profile-v1', 'SITE_PROFILE', 'profile', 1, 'PUBLISHED', PRIOR_PROFILE, 1, MANAGER.id)
  const stationV1 = versionRow('station-v1', 'STATION', 'ST01', 1, 'PUBLISHED', stationSnapshot(PRIOR_STATION.name, PRIOR_STATION.body), 1, MANAGER.id)
  const state = {
    onboardingStatus: 'PENDING' as 'PENDING' | 'APPROVED',
    members: [] as Member[],
    versions: [profileV1, stationV1],
    publicProfile: { ...PRIOR_PROFILE },
    publicStation: { ...PRIOR_STATION },
    audits: [] as AuditEvent[],
    seq: 3,
  }

  await page.route((url) => new URL(url).pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    const person = ACTORS.find((item) => request.headers().authorization === `Bearer ${item.token}`) ?? null
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } })
    const fail = (status: number, message: string) => route.fulfill({
      status,
      json: { success: false, code: status === 403 ? 'FORBIDDEN' : 'BUSINESS_RULE', message },
    })

    if (path === '/api/profile/me' && method === 'GET') {
      if (!person) return fail(401, 'Unauthorized')
      return ok({
        id: person.id,
        email: person.email,
        displayName: person.displayName,
        avatarUrl: null,
        role: person.platformRole,
        tier: 'PREMIUM',
        orgId: null,
        orgName: null,
        orgSubscription: 'NONE',
        orgRole: null,
        level: 1,
        totalPoints: 0,
        city: null,
        emailVerified: true,
        activeVisitSites: [],
      })
    }

    if (path === '/api/admin/site-onboarding-requests' && method === 'GET') {
      return ok([onboardingPayload(state.onboardingStatus)])
    }
    const approve = path.match(/^\/api\/admin\/site-onboarding-requests\/([^/]+)\/approve$/)
    if (approve && method === 'POST') {
      if (person?.platformRole !== 'ADMIN') return fail(403, 'Không có quyền duyệt onboarding')
      if (decodeURIComponent(approve[1]) !== ONBOARDING_ID) return fail(404, 'Không tìm thấy yêu cầu')
      state.onboardingStatus = 'APPROVED'
      state.members = [{ userId: MANAGER.id, role: 'SITE_MANAGER', active: true }]
      pushAudit(state, person, 'SITE_ONBOARDING', ONBOARDING_ID, 'APPROVED', 'Đã xác minh đại diện')
      return ok(onboardingPayload('APPROVED'))
    }

    if (path === '/api/site-workspaces/mine' && method === 'GET') {
      if (!person) return ok([])
      return ok(state.members.filter((member) => member.userId === person.id && member.active).map((member) => ({
        siteCode: SITE,
        locationName: state.publicProfile.name,
        role: member.role,
        requiresTripConfirmation: false,
      })))
    }

    const workspace = path.match(/^\/api\/site-workspaces\/([^/]+)$/)
    if (workspace && method === 'GET') {
      const membership = person ? state.members.find((member) => member.userId === person.id && member.active) : undefined
      if (!membership && person?.platformRole !== 'ADMIN') return fail(403, 'Không có quyền truy cập site workspace này')
      return ok({
        siteCode: SITE,
        locationName: state.publicProfile.name,
        callerRole: membership?.role ?? null,
        requiresTripConfirmation: false,
        members: membership?.role === 'SITE_MANAGER' ? state.members : null,
        ...state.publicProfile,
      })
    }

    if (/^\/api\/site-workspaces\/[^/]+\/members$/.test(path) && method === 'GET') return ok(state.members)
    if (/^\/api\/site-workspaces\/[^/]+\/members$/.test(path) && method === 'PUT') {
      const body = request.postDataJSON() as { userId: string; role: SiteRole }
      const saved = { userId: body.userId, role: body.role, active: true }
      state.members = [...state.members.filter((member) => member.userId !== saved.userId), saved]
      return ok(saved)
    }
    if (/^\/api\/site-workspaces\/[^/]+\/content\/versions$/.test(path) && method === 'GET') {
      const status = url.searchParams.get('status')
      const rows = status ? state.versions.filter((item) => item.status === status) : state.versions
      return ok(rows.map((item) => ({ ...item })))
    }
    if (/^\/api\/site-workspaces\/[^/]+\/operations$/.test(path) && method === 'GET') {
      return ok({ siteCode: SITE, from: url.searchParams.get('from'), to: url.searchParams.get('to'), visitCount: 0, checkinsByStation: [], questCompletions: 0, contentInteractions: {} })
    }

    const action = path.match(/^\/api\/site-workspaces\/([^/]+)\/content\/(SITE_PROFILE|STATION)\/([^/]+)\/versions(?:\/(\d+)(?:\/(submit|review|publish|rollback))?)?$/)
    if (action) return handleContent(route, action, method, person, state)

    if (path === '/api/locations' && method === 'GET') {
      return ok({
        items: [publicLocation(state.publicProfile)],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      })
    }
    if (path === `/api/locations/${LOCATION_ID}` && method === 'GET') return ok(publicLocation(state.publicProfile))
    if (path === `/api/sites/${SITE}/stations` && method === 'GET') return ok([publicStation(state.publicStation)])
    if (path === `/api/sites/${SITE}/stations/ST01` && method === 'GET') return ok(publicStation(state.publicStation))
    if (path === `/api/sites/${SITE}/story` && method === 'GET') return ok([])
    if (path === `/api/sites/${SITE}/stations/ST01/games` && method === 'GET') return ok([])
    if (path.startsWith('/api/characters/') && method === 'GET') return ok([])

    if (path === '/api/admin/audit' && method === 'GET') {
      const entityType = url.searchParams.get('entityType')
      const actionName = url.searchParams.get('action')
      const items = state.audits.filter((item) => (
        (!entityType || item.entityType === entityType) && (!actionName || item.action === actionName)
      ))
      return ok({ items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 })
    }

    return route.fulfill({
      status: 404,
      json: { success: false, code: 'NOT_FOUND', message: `No mock for ${method} ${path}` },
    })
  })
}

function handleContent(
  route: Route,
  action: RegExpMatchArray,
  method: string,
  person: Actor | null,
  state: {
    versions: Version[]
    publicProfile: typeof PRIOR_PROFILE
    publicStation: typeof PRIOR_STATION
    audits: AuditEvent[]
    seq: number
    members: Member[]
  },
) {
  const ok = (data: unknown) => route.fulfill({ json: { success: true, data: { ...data as Version } } })
  const fail = (status: number, message: string) => route.fulfill({
    status,
    json: { success: false, code: status === 409 ? 'CONFLICT' : status === 403 ? 'FORBIDDEN' : 'BUSINESS_RULE', message },
  })
  if (!person) return fail(401, 'Unauthorized')
  const membership = state.members.find((member) => member.userId === person.id && member.active)
  const siteRole = membership?.role
  const kind = action[2] as ContentKind
  const resourceKey = decodeURIComponent(action[3])
  const versionNumber = action[4] ? Number(action[4]) : null
  const verb = action[5]
  const body = method === 'GET' ? null : route.request().postDataJSON() as {
    snapshot?: unknown
    decision?: string
    note?: string | null
    reason?: string
    expectedRevision?: number
  }

  if (method === 'POST' && versionNumber == null) {
    if (siteRole !== 'SITE_MANAGER' && siteRole !== 'CONTENT_EDITOR') return fail(403, 'Không có quyền sửa nội dung')
    const nextVersion = state.versions
      .filter((item) => item.contentKind === kind && item.resourceKey === resourceKey)
      .reduce((max, item) => Math.max(max, item.version), 0) + 1
    const created = versionRow(`ver-${state.seq++}`, kind, resourceKey, nextVersion, 'DRAFT', body?.snapshot ?? {}, 1, person.id)
    state.versions = [created, ...state.versions]
    return ok(created)
  }

  const current = state.versions.find((item) => item.contentKind === kind && item.resourceKey === resourceKey && item.version === versionNumber)
  if (!current) return fail(404, 'Không tìm thấy phiên bản nội dung')

  if (method === 'POST' && verb === 'submit') {
    if (current.revision !== body?.expectedRevision) return fail(409, 'Content version was changed by another editor')
    current.status = 'IN_REVIEW'
    current.submittedBy = person.id
    current.revision += 1
    return ok(current)
  }

  if (method === 'POST' && verb === 'review') {
    if (siteRole !== 'CONTENT_REVIEWER' && siteRole !== 'SITE_MANAGER') return fail(403, 'Không có quyền duyệt nội dung')
    if (person.id === current.submittedBy) return fail(403, 'Không thể tự duyệt nội dung do chính mình gửi')
    if (current.revision !== body?.expectedRevision) return fail(409, 'Content version was changed by another editor')
    current.status = body?.decision === 'REQUEST_CHANGES' ? 'DRAFT' : 'APPROVED'
    current.reviewedBy = person.id
    current.reviewNote = body?.note ?? null
    current.revision += 1
    return ok(current)
  }

  if (method === 'POST' && verb === 'publish') {
    if (siteRole !== 'SITE_MANAGER') return fail(403, 'Không có quyền phát hành')
    if (current.status !== 'APPROVED') return fail(422, 'Chỉ bản đã duyệt mới được phát hành')
    if (current.revision !== body?.expectedRevision) return fail(409, 'Content version was changed by another editor')
    for (const item of state.versions) {
      if (item !== current && item.contentKind === kind && item.resourceKey === resourceKey && item.status === 'PUBLISHED') {
        item.status = 'ARCHIVED'
      }
    }
    current.status = 'PUBLISHED'
    current.publishedBy = person.id
    current.revision += 1
    applyPublic(state, current)
    pushAudit(state, person, 'SITE_CONTENT', current.id, 'SITE_CONTENT_PUBLISHED', null)
    return ok(current)
  }

  if (method === 'POST' && verb === 'rollback') {
    if (siteRole !== 'SITE_MANAGER' && person.platformRole !== 'ADMIN') return fail(403, 'Không có quyền thu hồi')
    const reason = body?.reason?.trim() ?? ''
    if (!reason) return fail(422, 'Lý do thu hồi là bắt buộc')
    if (current.status !== 'ARCHIVED') return fail(422, 'Chỉ có thể khôi phục một bản đã phát hành')
    const live = state.versions.filter((item) => item.contentKind === kind && item.resourceKey === resourceKey && item.status === 'PUBLISHED')
    if (live.length !== 1) return fail(422, 'Không có đúng một bản đang phát hành để thu hồi')
    if (live[0].revision !== body?.expectedRevision) return fail(409, 'Content version was changed by another editor')
    live[0].status = 'ARCHIVED'
    const nextVersion = state.versions
      .filter((item) => item.contentKind === kind && item.resourceKey === resourceKey)
      .reduce((max, item) => Math.max(max, item.version), 0) + 1
    const restored = versionRow(`ver-${state.seq++}`, kind, resourceKey, nextVersion, 'PUBLISHED', JSON.parse(current.snapshotJson) as unknown, 1, current.createdBy)
    restored.publishedBy = person.id
    restored.reviewNote = reason
    state.versions = [restored, ...state.versions]
    applyPublic(state, restored)
    pushAudit(state, person, 'SITE_CONTENT', restored.id, 'SITE_CONTENT_ROLLED_BACK', reason)
    return ok(restored)
  }

  return fail(404, 'Không tìm thấy phiên bản nội dung')
}

function applyPublic(
  state: { publicProfile: typeof PRIOR_PROFILE; publicStation: typeof PRIOR_STATION },
  version: Version,
) {
  const snapshot = JSON.parse(version.snapshotJson) as typeof PRIOR_PROFILE & { blocks?: Array<{ body?: string }> }
  if (version.contentKind === 'SITE_PROFILE') {
    state.publicProfile = {
      name: snapshot.name,
      description: snapshot.description,
      formattedAddress: snapshot.formattedAddress,
      coverImage: snapshot.coverImage,
      sources: snapshot.sources,
    }
    return
  }
  state.publicStation = {
    name: snapshot.name,
    body: snapshot.blocks?.[0]?.body ?? '',
  }
}

function versionRow(
  id: string,
  contentKind: ContentKind,
  resourceKey: string,
  version: number,
  status: Version['status'],
  snapshot: unknown,
  revision: number,
  createdBy: string,
): Version {
  return {
    id,
    siteCode: SITE,
    contentKind,
    resourceKey,
    version,
    status,
    snapshotJson: JSON.stringify(snapshot),
    revision,
    createdBy,
    submittedBy: status === 'PUBLISHED' ? createdBy : null,
    reviewedBy: null,
    publishedBy: status === 'PUBLISHED' ? createdBy : null,
    reviewNote: null,
  }
}

function stationSnapshot(name: string, body: string) {
  return {
    stationCode: 'ST01',
    name,
    sortOrder: 1,
    lat: 11.142,
    lng: 106.462,
    questStepKey: 'entrance',
    active: true,
    blocks: [{ blockType: 'TEXT', title: 'Giới thiệu', body, mediaUrl: '', sortOrder: 0, metaJson: null }],
  }
}

function publicLocation(profile: typeof PRIOR_PROFILE) {
  return {
    id: LOCATION_ID,
    ...profile,
    latitude: 11.142,
    longitude: 106.462,
    city: 'TP. Hồ Chí Minh',
    createdAt: '2020-01-01T00:00:00.000Z',
  }
}

function publicStation(station: typeof PRIOR_STATION) {
  return {
    id: 'station-st01',
    siteCode: SITE,
    code: 'ST01',
    name: station.name,
    sortOrder: 1,
    lat: 11.142,
    lng: 106.462,
    questStepKey: 'entrance',
    active: true,
    blocks: [{ id: 'block-st01', blockType: 'TEXT', title: 'Giới thiệu', body: station.body, mediaUrl: null, sortOrder: 0 }],
  }
}

function onboardingPayload(status: 'PENDING' | 'APPROVED') {
  return {
    id: ONBOARDING_ID,
    requesterId: MANAGER.id,
    siteCode: SITE,
    representativeName: 'Nguyễn Văn Đại diện',
    organizationName: 'Ban quản lý Địa đạo Củ Chi',
    representativeEmail: MANAGER.email,
    evidenceNote: 'Công văn xác minh đại diện',
    status,
    reviewedBy: status === 'APPROVED' ? ADMIN.id : null,
    reviewNote: status === 'APPROVED' ? 'Đã xác minh đại diện' : null,
    createdAt: '2026-10-24T00:00:00.000Z',
    reviewedAt: status === 'APPROVED' ? '2026-10-24T01:00:00.000Z' : null,
  }
}

function pushAudit(
  state: { audits: AuditEvent[]; seq: number },
  person: Actor,
  entityType: string,
  entityId: string,
  action: string,
  reason: string | null,
) {
  state.audits = [{
    id: `audit-${state.seq++}`,
    actorId: person.id,
    entityType,
    entityId,
    action,
    reason,
    occurredAt: '2026-10-24T02:00:00.000Z',
  }, ...state.audits]
}
