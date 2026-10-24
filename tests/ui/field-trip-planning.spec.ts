import { expect, test, type Page } from '@playwright/test'
import { STORAGE_KEYS } from '../helpers/constants.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORG_ID = '22222222-2222-4222-8222-222222222222'
const QUEST_ID = '33333333-3333-4333-8333-333333333333'
const CAMPAIGN_ID = '44444444-4444-4444-8444-444444444444'
const DRAFT_ID = '55555555-5555-4555-8555-555555555555'
const PENDING_ID = '66666666-6666-4666-8666-666666666666'
const CREATED_ID = '77777777-7777-4777-8777-777777777777'
const GROUP_A = '88888888-8888-4888-8888-888888888888'
const GROUP_B = '99999999-9999-4999-8999-999999999999'
const JOIN_CODE = 'CUCHI2K6'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoaXN0YXItdHJpcCIsInJvbGUiOiJURUFDSEVSIiwiZXhwIjo0MDcwOTA4ODAwfQ.e2efakesig'

const VISIT_START = '2026-11-02T01:30:00.000Z'
const VISIT_END = '2026-11-02T04:30:00.000Z'

type TripStatus = 'DRAFT' | 'PENDING_SITE' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
type Confirmation = 'NOT_REQUIRED' | 'PENDING' | 'CONFIRMED' | 'DECLINED'

type Trip = {
  id: string
  orgId: string
  siteCode: string
  title: string
  visitStart: string
  visitEnd: string
  questId: string
  campaignId: string
  joinCode: string
  status: TripStatus
  siteConfirmationStatus: Confirmation
  siteNote: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  rowVersion: number
}

type Group = {
  id: string
  name: string
  participationMode: 'INDIVIDUAL' | 'SHARED_DEVICE'
  declaredSize: number | null
  memberCount: number
}

type Calls = {
  groupMine: number
  joinPosts: number
}

type MockOptions = {
  role?: 'TEACHER' | 'USER'
  trips?: Trip[]
  groups?: Group[]
  joinErrors?: Record<string, string>
  calls?: Calls
}

function trip(partial: Partial<Trip> & Pick<Trip, 'id' | 'title' | 'status'>): Trip {
  return {
    orgId: ORG_ID,
    siteCode: 'cu-chi',
    visitStart: VISIT_START,
    visitEnd: VISIT_END,
    questId: QUEST_ID,
    campaignId: CAMPAIGN_ID,
    joinCode: JOIN_CODE,
    siteConfirmationStatus: partial.status === 'PENDING_SITE' ? 'PENDING' : 'NOT_REQUIRED',
    siteNote: null,
    createdBy: USER_ID,
    createdAt: '2026-10-24T01:00:00.000Z',
    updatedAt: '2026-10-24T01:00:00.000Z',
    rowVersion: 4,
    ...partial,
  }
}

async function seed(page: Page, role: 'TEACHER' | 'USER') {
  await page.addInitScript(({ storageKeys, token, userId, role: nextRole }) => {
    const entries: Record<string, string> = {
      [storageKeys.token]: token,
      [storageKeys.userId]: userId,
      [storageKeys.displayName]: nextRole === 'TEACHER' ? 'Cô Lan' : 'Học sinh An',
      [storageKeys.email]: nextRole === 'TEACHER' ? 'teacher@example.invalid' : 'student@example.invalid',
      [storageKeys.role]: nextRole,
      [storageKeys.tier]: 'PREMIUM',
      timelens_email_verified: '1',
      [storageKeys.mode]: 'online',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }),
      sidenav_collapsed: 'false',
      'timelens:teacher-onboarding-complete': 'true',
    }
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
  }, { storageKeys: STORAGE_KEYS, token: TOKEN, userId: USER_ID, role })
}

async function mockFieldTrips(page: Page, options: MockOptions = {}) {
  const role = options.role ?? 'TEACHER'
  const calls = options.calls ?? { groupMine: 0, joinPosts: 0 }
  const state = {
    trips: [...(options.trips ?? [])],
    groups: [...(options.groups ?? [])],
  }

  await page.route((url) => new URL(url).pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } })
    const fail = (status: number, message: string) => route.fulfill({
      status,
      json: { success: false, code: status === 404 ? 'NOT_FOUND' : 'BUSINESS_RULE', message },
    })

    if (path === '/api/profile/me' && method === 'GET') {
      return ok({
        id: USER_ID,
        email: role === 'TEACHER' ? 'teacher@example.invalid' : 'student@example.invalid',
        displayName: role === 'TEACHER' ? 'Cô Lan' : 'Học sinh An',
        avatarUrl: null,
        role,
        tier: 'PREMIUM',
        orgId: role === 'TEACHER' ? ORG_ID : null,
        orgName: role === 'TEACHER' ? 'Lớp 6A' : null,
        orgSubscription: 'STANDARD',
        orgRole: role === 'TEACHER' ? 'teacher' : null,
        level: 1,
        totalPoints: 0,
        city: null,
        emailVerified: true,
      })
    }
    if (path === '/api/org/mine' && method === 'GET') {
      return ok([{ organizationId: ORG_ID, name: 'Lớp 6A', orgRole: 'teacher' }])
    }
    if (/^\/api\/org\/[^/]+\/analytics$/.test(path) && method === 'GET') {
      return ok({ organizationId: ORG_ID, name: 'Lớp 6A', orgType: 'SCHOOL', memberCount: 12, completionRatePct: 0, fullTourRatePct: 0, note: '' })
    }
    if (/^\/api\/org\/[^/]+\/roster$/.test(path) && method === 'GET') return ok([])
    if (/^\/api\/org\/[^/]+\/invite-code$/.test(path) && method === 'GET') {
      return ok({ inviteCode: 'INVITE1', expiresAt: '2026-12-01T00:00:00.000Z', organizationId: ORG_ID })
    }
    if (/^\/api\/org\/[^/]+\/dashboard-stats$/.test(path) && method === 'GET') {
      return ok({
        organizationId: ORG_ID,
        orgName: 'Lớp 6A',
        planType: 'STANDARD',
        endDate: null,
        isActive: true,
        aiQueriesUsed: 0,
        aiQueriesLimit: 10,
        quotaResetsOn: null,
        verifiedAccounts: 1,
        maxVerifiedAccounts: 30,
        accountLimitReached: false,
        ccuCurrent: 0,
        maxCcu: 30,
        ccuLimitReached: false,
        daysUntilExpiry: 20,
      })
    }
    if (path === '/api/groups/mine') {
      calls.groupMine += 1
      return ok([])
    }

    if (path === '/api/teacher/field-trips' && method === 'GET') return ok(state.trips)
    if (path === '/api/teacher/field-trips' && method === 'POST') {
      const body = request.postDataJSON() as Partial<Trip>
      const created = trip({
        id: CREATED_ID,
        title: body.title ?? 'Chuyến mới',
        status: 'DRAFT',
        orgId: body.orgId,
        siteCode: body.siteCode,
        visitStart: body.visitStart,
        visitEnd: body.visitEnd,
        questId: body.questId,
        campaignId: body.campaignId,
        joinCode: 'NEWJOIN1',
        rowVersion: 1,
      })
      state.trips = [created, ...state.trips]
      return ok(created)
    }

    const groupCreate = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/groups$/)
    if (groupCreate && method === 'POST') {
      const body = request.postDataJSON() as { name: string; participationMode: Group['participationMode']; declaredSize?: number }
      const created: Group = {
        id: `group-${state.groups.length + 1}`,
        name: body.name,
        participationMode: body.participationMode,
        declaredSize: body.declaredSize ?? null,
        memberCount: 0,
      }
      state.groups = [...state.groups, created]
      return ok({ ...created, code: 'GRP1', expiresAt: null, orgId: ORG_ID, questId: QUEST_ID, fieldTripId: groupCreate[1] })
    }

    const transition = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/(request-confirmation|start|cancel)$/)
    if (transition && method === 'POST') {
      const current = state.trips.find((item) => item.id === transition[1])
      if (!current) return fail(404, 'Không tìm thấy chuyến đi')
      const nextStatus: TripStatus = transition[2] === 'start' ? 'ACTIVE' : transition[2] === 'cancel' ? 'CANCELLED' : 'PENDING_SITE'
      const next = {
        ...current,
        status: nextStatus,
        siteConfirmationStatus: transition[2] === 'request-confirmation' ? 'PENDING' as const : current.siteConfirmationStatus,
        rowVersion: current.rowVersion + 1,
      }
      state.trips = state.trips.map((item) => (item.id === next.id ? next : item))
      return ok(next)
    }

    const one = path.match(/^\/api\/teacher\/field-trips\/([^/]+)$/)
    if (one && method === 'GET') {
      const current = state.trips.find((item) => item.id === one[1])
      return current ? ok(current) : fail(404, 'Không tìm thấy chuyến đi')
    }
    if (one && method === 'PUT') {
      const body = request.postDataJSON() as Partial<Trip> & { rowVersion?: number }
      const current = state.trips.find((item) => item.id === one[1])
      if (!current) return fail(404, 'Không tìm thấy chuyến đi')
      const next = trip({
        ...current,
        title: body.title ?? current.title,
        siteCode: body.siteCode ?? current.siteCode,
        visitStart: body.visitStart ?? current.visitStart,
        visitEnd: body.visitEnd ?? current.visitEnd,
        questId: body.questId ?? current.questId,
        campaignId: body.campaignId ?? current.campaignId,
        rowVersion: current.rowVersion + 1,
      })
      state.trips = state.trips.map((item) => (item.id === next.id ? next : item))
      return ok(next)
    }

    const preview = path.match(/^\/api\/field-trips\/join\/([^/]+)$/)
    if (preview && method === 'GET') {
      const code = decodeURIComponent(preview[1])
      const message = options.joinErrors?.[code]
      if (message) return fail(422, message)
      const current = state.trips.find((item) => item.joinCode === code) ?? state.trips[0]
      if (!current) return fail(422, 'Mã chuyến không hợp lệ')
      return ok({
        title: current.title,
        siteCode: current.siteCode,
        visitStart: current.visitStart,
        visitEnd: current.visitEnd,
        status: current.status,
        groups: state.groups,
      })
    }
    if (path === '/api/field-trips/join' && method === 'POST') {
      calls.joinPosts += 1
      const body = request.postDataJSON() as { code?: string; groupId?: string }
      const message = body.code ? options.joinErrors?.[body.code] : undefined
      if (message) return fail(422, message)
      const group = state.groups.find((item) => item.id === body.groupId) ?? state.groups[0]
      return ok({ ...(group ?? { id: body.groupId, name: 'Nhóm', participationMode: 'INDIVIDUAL', declaredSize: null, memberCount: 1 }), memberCount: 1 })
    }

    if (method !== 'GET' && method !== 'HEAD') return fail(404, 'Not found')
    return ok([])
  })
}

test('teacher creates a trip from the list and the POST body matches the form', async ({ page }) => {
  await seed(page, 'TEACHER')
  await mockFieldTrips(page)
  await page.goto('/teacher')
  await page.getByRole('link', { name: 'Chuyến tham quan' }).click()
  await expect(page).toHaveURL(/\/teacher\/trips$/)
  await expect(page.getByRole('heading', { name: 'Chuyến tham quan' })).toBeVisible()

  await page.getByLabel('Tổ chức').selectOption(ORG_ID)
  await page.getByLabel('Mã di tích').fill('cu-chi')
  await page.getByLabel('Tiêu đề').fill('Tham quan Địa đạo')
  await page.getByLabel('Giờ đến').fill('2026-11-02T08:30')
  await page.getByLabel('Giờ về').fill('2026-11-02T11:30')
  await page.getByLabel('Mã nhiệm vụ').fill(QUEST_ID)
  await page.getByLabel('Mã chiến dịch').fill(CAMPAIGN_ID)
  const create = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === '/api/teacher/field-trips')
  await page.getByRole('button', { name: 'Tạo chuyến' }).click()
  expect((await create).postDataJSON()).toEqual({
    orgId: ORG_ID,
    siteCode: 'cu-chi',
    title: 'Tham quan Địa đạo',
    visitStart: new Date('2026-11-02T08:30').toISOString(),
    visitEnd: new Date('2026-11-02T11:30').toISOString(),
    questId: QUEST_ID,
    campaignId: CAMPAIGN_ID,
  })
  await expect(page.getByRole('link', { name: 'Tham quan Địa đạo' })).toHaveAttribute('href', `/teacher/trips/${CREATED_ID}`)
})

test('edits a draft with rowVersion and hides start while the site is pending', async ({ page }) => {
  await seed(page, 'TEACHER')
  await mockFieldTrips(page, {
    trips: [
      trip({ id: DRAFT_ID, title: 'Nháp buổi sáng', status: 'DRAFT', rowVersion: 4 }),
      trip({ id: PENDING_ID, title: 'Chờ cổng di tích', status: 'PENDING_SITE', siteConfirmationStatus: 'PENDING', rowVersion: 2 }),
    ],
  })
  await page.goto(`/teacher/trips/${DRAFT_ID}`)
  await expect(page.getByRole('heading', { name: 'Nháp buổi sáng' })).toBeVisible()
  await page.getByLabel('Tiêu đề').fill('Tham quan buổi sáng')
  const update = page.waitForRequest((request) =>
    request.method() === 'PUT' && new URL(request.url()).pathname === `/api/teacher/field-trips/${DRAFT_ID}`)
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  const body = (await update).postDataJSON() as { title: string; rowVersion: number; siteCode: string; questId: string; campaignId: string; visitStart: string; visitEnd: string }
  expect(body.rowVersion).toBe(4)
  expect(body.title).toBe('Tham quan buổi sáng')
  expect(body.siteCode).toBe('cu-chi')
  expect(body.questId).toBe(QUEST_ID)
  expect(body.campaignId).toBe(CAMPAIGN_ID)
  expect(new Date(body.visitStart).getTime()).toBe(new Date(VISIT_START).getTime())
  expect(new Date(body.visitEnd).getTime()).toBe(new Date(VISIT_END).getTime())

  await page.goto(`/teacher/trips/${PENDING_ID}`)
  await expect(page.getByText('Đang chờ di tích xác nhận')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu chuyến', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toHaveCount(0)
})

test('creates individual and shared-device groups from the trip detail', async ({ page }) => {
  const calls: Calls = { groupMine: 0, joinPosts: 0 }
  await seed(page, 'TEACHER')
  await mockFieldTrips(page, {
    calls,
    trips: [trip({ id: DRAFT_ID, title: 'Nháp buổi sáng', status: 'DRAFT' })],
  })
  await page.goto(`/teacher/trips/${DRAFT_ID}`)
  await page.getByLabel('Tên nhóm').fill('Tổ 1')
  await page.getByLabel('Hình thức tham gia').selectOption('INDIVIDUAL')
  const individual = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/teacher/field-trips/${DRAFT_ID}/groups`)
  await page.getByRole('button', { name: 'Tạo nhóm' }).click()
  expect((await individual).postDataJSON()).toEqual({ name: 'Tổ 1', participationMode: 'INDIVIDUAL' })
  await expect(page.getByText('Tổ 1')).toBeVisible()

  await page.getByLabel('Tên nhóm').fill('Tổ chung')
  await page.getByLabel('Hình thức tham gia').selectOption('SHARED_DEVICE')
  await page.getByLabel('Sĩ số dự kiến').fill('12')
  const shared = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/teacher/field-trips/${DRAFT_ID}/groups`)
  await page.getByRole('button', { name: 'Tạo nhóm' }).click()
  expect((await shared).postDataJSON()).toEqual({ name: 'Tổ chung', participationMode: 'SHARED_DEVICE', declaredSize: 12 })
  await expect(page.getByText('Tổ chung')).toBeVisible()
  expect(calls.groupMine).toBe(0)
})

test('shows the join link and QR for the trip code', async ({ page }) => {
  await seed(page, 'TEACHER')
  await mockFieldTrips(page, {
    trips: [trip({ id: DRAFT_ID, title: 'Nháp buổi sáng', status: 'DRAFT', joinCode: JOIN_CODE })],
  })
  await page.goto(`/teacher/trips/${DRAFT_ID}`)
  const joinPath = `/trip/join/${JOIN_CODE}`
  await expect(page.getByRole('link', { name: new RegExp(joinPath) })).toHaveAttribute('href', new RegExp(`${joinPath}$`))
  await expect(page.getByRole('img', { name: new RegExp(joinPath) })).toHaveAttribute('src', /^data:image\/png;base64,/)
  await expect(page.getByRole('link', { name: 'Mở nhiệm vụ' })).toHaveAttribute('href', `/quests/${QUEST_ID}`)
  await expect(page.getByRole('link', { name: 'Quét trạm' })).toHaveAttribute('href', '/scan')
})

test('student previews groups and joins with code plus groupId', async ({ page }) => {
  await seed(page, 'USER')
  await mockFieldTrips(page, {
    role: 'USER',
    trips: [trip({ id: DRAFT_ID, title: 'Tham quan Địa đạo', status: 'DRAFT', joinCode: JOIN_CODE })],
    groups: [
      { id: GROUP_A, name: 'Tổ 1', participationMode: 'INDIVIDUAL', declaredSize: null, memberCount: 0 },
      { id: GROUP_B, name: 'Tổ chung', participationMode: 'SHARED_DEVICE', declaredSize: 12, memberCount: 0 },
    ],
  })
  await page.goto(`/trip/join/${JOIN_CODE}`)
  await expect(page.getByRole('heading', { name: 'Tham quan Địa đạo' })).toBeVisible()
  await expect(page.getByText('cu-chi')).toBeVisible()
  await expect(page.locator('time').first()).toHaveAttribute('datetime', VISIT_START)
  await page.getByRole('radio', { name: /Tổ 1/ }).check()
  const join = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === '/api/field-trips/join')
  await page.getByRole('button', { name: 'Tham gia nhóm' }).click()
  expect((await join).postDataJSON()).toEqual({ code: JOIN_CODE, groupId: GROUP_A })
  await expect(page.getByText('Đã tham gia nhóm')).toBeVisible()
})

test('invalid, cancelled, completed, and expired codes show the backend message', async ({ page }) => {
  const calls: Calls = { groupMine: 0, joinPosts: 0 }
  const joinErrors = {
    BADCODE1: 'Mã chuyến không hợp lệ',
    CANCEL01: 'Chuyến đi đã bị hủy',
    DONECODE: 'Chuyến đi đã kết thúc',
    EXPIRED1: 'Chuyến đi đã hết hạn',
  }
  await seed(page, 'USER')
  await mockFieldTrips(page, { role: 'USER', calls, joinErrors })
  for (const [code, message] of Object.entries(joinErrors)) {
    await page.goto(`/trip/join/${code}`)
    await expect(page.getByRole('alert')).toContainText(message)
    await expect(page.getByRole('button', { name: 'Tham gia nhóm' })).toHaveCount(0)
  }
  expect(calls.joinPosts).toBe(0)
})
