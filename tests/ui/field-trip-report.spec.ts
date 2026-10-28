import { expect, test, type Page } from '@playwright/test'
import { STORAGE_KEYS } from '../helpers/constants.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORG_ID = '22222222-2222-4222-8222-222222222222'
const QUEST_ID = '33333333-3333-4333-8333-333333333333'
const CAMPAIGN_ID = '44444444-4444-4444-8444-444444444444'
const TRIP_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const TRIP_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const GROUP_SHARED = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3'
const GROUP_INDIV = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4'
const GROUP_B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5'
const USER_AN = 'ffffffff-ffff-4fff-8fff-fffffffffff6'
const USER_BINH = '12121212-1212-4121-8121-121212121212'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoaXN0YXItdHJpcCIsInJvbGUiOiJURUFDSEVSIiwiZXhwIjo0MDcwOTA4ODAwfQ.e2efakesig'

const VISIT_START = '2026-11-02T01:30:00.000Z'
const VISIT_END = '2026-11-02T04:30:00.000Z'
const GENERATED_AT = '2026-11-02T06:00:00.000Z'

type TripStatus = 'DRAFT' | 'PENDING_SITE' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
type Mode = 'INDIVIDUAL' | 'SHARED_DEVICE'

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
  siteConfirmationStatus: 'NOT_REQUIRED' | 'PENDING' | 'CONFIRMED' | 'DECLINED'
  siteNote: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  rowVersion: number
}

type LiveRow = {
  groupId: string
  groupName: string
  participationMode: Mode
  userId: string | null
  displayName: string
  headcount: number
  stationsCompleted: number
  points: number
  email?: string
  photoUrl?: string
}

type ReportGroup = {
  groupId: string
  name: string
  participationMode: Mode
  headcount: number
  stationsCompleted: number
  questCompletions: number
  points: number
  email?: string
  photoUrl?: string
}

type Report = {
  tripId: string
  title: string
  siteCode: string
  questId: string
  campaignId: string
  status: TripStatus
  generatedAt: string
  groups: ReportGroup[]
}

type Calls = {
  live: Record<string, number>
}

type MockOptions = {
  trips?: Trip[]
  boards?: Record<string, { status: TripStatus; rows: LiveRow[] }>
  reports?: Record<string, Report>
  reportError?: string
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
    joinCode: `JOIN${partial.id.slice(0, 4)}`,
    siteConfirmationStatus: 'NOT_REQUIRED',
    siteNote: null,
    createdBy: USER_ID,
    createdAt: '2026-10-24T01:00:00.000Z',
    updatedAt: '2026-10-24T01:00:00.000Z',
    rowVersion: 7,
    ...partial,
  }
}

const sharedRow: LiveRow = {
  groupId: GROUP_SHARED,
  groupName: 'Tổ chung',
  participationMode: 'SHARED_DEVICE',
  userId: null,
  displayName: 'Tổ chung',
  headcount: 12,
  stationsCompleted: 4,
  points: 30,
  email: 'shared-device@example.invalid',
  photoUrl: 'https://cdn.example.invalid/shared.jpg',
}

const individualRow: LiveRow = {
  groupId: GROUP_INDIV,
  groupName: 'Tổ 1',
  participationMode: 'INDIVIDUAL',
  userId: USER_AN,
  displayName: 'An',
  headcount: 1,
  stationsCompleted: 2,
  points: 15,
  email: 'an.student@example.invalid',
  photoUrl: 'https://cdn.example.invalid/an.jpg',
}

const otherTripRow: LiveRow = {
  groupId: GROUP_B,
  groupName: 'Tổ bảo tàng',
  participationMode: 'INDIVIDUAL',
  userId: USER_BINH,
  displayName: 'Bình',
  headcount: 1,
  stationsCompleted: 9,
  points: 99,
  email: 'binh.student@example.invalid',
  photoUrl: 'https://cdn.example.invalid/binh.jpg',
}

function snapshotReport(id: string, title: string): Report {
  return {
    tripId: id,
    title,
    siteCode: 'cu-chi',
    questId: QUEST_ID,
    campaignId: CAMPAIGN_ID,
    status: 'COMPLETED',
    generatedAt: GENERATED_AT,
    groups: [
      {
        groupId: GROUP_SHARED,
        name: 'Tổ chung',
        participationMode: 'SHARED_DEVICE',
        headcount: 12,
        stationsCompleted: 4,
        questCompletions: 6,
        points: 40,
        email: 'shared-device@example.invalid',
        photoUrl: 'https://cdn.example.invalid/shared.jpg',
      },
      {
        groupId: GROUP_INDIV,
        name: 'Tổ 1',
        participationMode: 'INDIVIDUAL',
        headcount: 1,
        stationsCompleted: 2,
        questCompletions: 1,
        points: 27,
        email: 'an.student@example.invalid',
        photoUrl: 'https://cdn.example.invalid/an.jpg',
      },
    ],
  }
}

async function seed(page: Page) {
  await page.addInitScript(({ storageKeys, token, userId }) => {
    const entries: Record<string, string> = {
      [storageKeys.token]: token,
      [storageKeys.userId]: userId,
      [storageKeys.displayName]: 'Cô Lan',
      [storageKeys.email]: 'teacher@example.invalid',
      [storageKeys.role]: 'TEACHER',
      [storageKeys.tier]: 'PREMIUM',
      timelens_email_verified: '1',
      [storageKeys.mode]: 'online',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }),
      sidenav_collapsed: 'false',
      'timelens:teacher-onboarding-complete': 'true',
    }
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
  }, { storageKeys: STORAGE_KEYS, token: TOKEN, userId: USER_ID })
}

async function mockFieldTrips(page: Page, options: MockOptions = {}) {
  const calls = options.calls ?? { live: {} }
  const state = {
    trips: [...(options.trips ?? [])],
    boards: { ...(options.boards ?? {}) },
    reports: { ...(options.reports ?? {}) },
  }

  await page.route((url) => new URL(url).pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } })
    const fail = (status: number, message: string) => route.fulfill({
      status,
      json: { success: false, code: 'BUSINESS_RULE', message },
    })

    if (path === '/api/profile/me' && method === 'GET') {
      return ok({
        id: USER_ID,
        email: 'teacher@example.invalid',
        displayName: 'Cô Lan',
        avatarUrl: null,
        role: 'TEACHER',
        tier: 'PREMIUM',
        orgId: ORG_ID,
        orgName: 'Lớp 6A',
        orgSubscription: 'STANDARD',
        orgRole: 'teacher',
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
    if (/^\/api\/org\/[^/]+\/live-board$/.test(path) && method === 'GET') {
      return ok({
        organizationId: ORG_ID,
        generatedAt: GENERATED_AT,
        windowStart: VISIT_START,
        memberCount: 1,
        activeMembers: 1,
        lastRallyAt: null,
        rows: [{
          userId: USER_BINH,
          displayName: 'Học sinh tổ chức',
          email: 'org-student@example.invalid',
          stationsCompleted: 1,
          score: 5,
          lastStationCode: 'ST01',
          lastActivityAt: null,
        }],
      })
    }
    if (/^\/api\/org\/[^/]+\/live-board\/stream$/.test(path)) {
      return route.fulfill({ status: 204, body: '' })
    }
    if (path === '/api/teacher/field-trips' && method === 'GET') return ok(state.trips)

    const live = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/live-board$/)
    if (live && method === 'GET') {
      const tripId = live[1]
      calls.live[tripId] = (calls.live[tripId] ?? 0) + 1
      const board = state.boards[tripId]
      if (!board) return fail(404, 'Không tìm thấy chuyến đi')
      return ok({ tripId, status: board.status, rows: board.rows })
    }

    const report = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/report$/)
    if (report && method === 'GET') {
      if (options.reportError) return fail(422, options.reportError)
      const stored = state.reports[report[1]]
      return stored ? ok(stored) : fail(422, 'Báo cáo chỉ có sau khi kết thúc chuyến')
    }

    const complete = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/complete$/)
    if (complete && method === 'POST') {
      const current = state.trips.find((item) => item.id === complete[1])
      if (!current) return fail(404, 'Không tìm thấy chuyến đi')
      const next = { ...current, status: 'COMPLETED' as const, rowVersion: current.rowVersion + 1 }
      state.trips = state.trips.map((item) => (item.id === next.id ? next : item))
      const board = state.boards[next.id]
      if (board) board.status = 'COMPLETED'
      return ok(next)
    }

    const one = path.match(/^\/api\/teacher\/field-trips\/([^/]+)$/)
    if (one && method === 'GET') {
      const current = state.trips.find((item) => item.id === one[1])
      return current ? ok(current) : fail(404, 'Không tìm thấy chuyến đi')
    }

    const preview = path.match(/^\/api\/field-trips\/join\/([^/]+)$/)
    if (preview && method === 'GET') {
      const code = decodeURIComponent(preview[1])
      const current = state.trips.find((item) => item.joinCode === code) ?? state.trips[0]
      if (!current) return fail(422, 'Mã chuyến không hợp lệ')
      return ok({
        title: current.title,
        siteCode: current.siteCode,
        visitStart: current.visitStart,
        visitEnd: current.visitEnd,
        status: current.status,
        groups: [],
      })
    }

    if (method !== 'GET' && method !== 'HEAD') return fail(404, 'Not found')
    return ok([])
  })
}

function twoTrips() {
  const morning = trip({ id: TRIP_A, title: 'Địa đạo buổi sáng', status: 'ACTIVE', joinCode: 'MORNING1' })
  const museum = trip({ id: TRIP_B, title: 'Bảo tàng buổi chiều', status: 'ACTIVE', joinCode: 'MUSEUM1' })
  return {
    trips: [morning, museum],
    boards: {
      [TRIP_A]: { status: 'ACTIVE' as const, rows: [individualRow, sharedRow] },
      [TRIP_B]: { status: 'ACTIVE' as const, rows: [otherTripRow] },
    },
  }
}

test('trip live header uses the selected trip and hides the other trip rows', async ({ page }) => {
  const calls: Calls = { live: {} }
  const seeded = twoTrips()
  await seed(page)
  await mockFieldTrips(page, { ...seeded, calls })
  await page.goto(`/teacher/trips/${TRIP_A}/live`)
  await expect(page.getByRole('heading', { name: 'Địa đạo buổi sáng' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'An' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Tổ chung' }).first()).toBeVisible()
  await expect(page.getByText('Bình')).toHaveCount(0)
  await expect(page.getByText('Tổ bảo tàng')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Bảo tàng buổi chiều' })).toHaveCount(0)
  expect(calls.live[TRIP_A]).toBeGreaterThan(0)
  expect(calls.live[TRIP_B] ?? 0).toBe(0)
})

test('shared-device live row shows one device label and the declared headcount', async ({ page }) => {
  const seeded = twoTrips()
  await seed(page)
  await mockFieldTrips(page, seeded)
  await page.goto(`/teacher/trips/${TRIP_A}/live`)
  const bodyRows = page.locator('table tbody tr')
  await expect(bodyRows).toHaveCount(2)
  const shared = bodyRows.filter({ hasText: 'Một thiết bị' })
  await expect(shared).toHaveCount(1)
  await expect(shared).toContainText('Tổ chung')
  await expect(shared).toContainText('12')
  await expect(shared).not.toContainText('an.student@example.invalid')
  await expect(shared).not.toContainText('shared-device@example.invalid')
})

test('completed live board stops polling and links to the report', async ({ page }) => {
  const calls: Calls = { live: {} }
  await seed(page)
  await mockFieldTrips(page, {
    calls,
    trips: [trip({ id: TRIP_A, title: 'Địa đạo buổi sáng', status: 'COMPLETED', joinCode: 'MORNING1' })],
    boards: {
      [TRIP_A]: { status: 'COMPLETED', rows: [sharedRow] },
    },
  })
  await page.clock.install()
  await page.goto(`/teacher/trips/${TRIP_A}/live`)
  await expect(page.getByRole('heading', { name: 'Địa đạo buổi sáng' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Báo cáo' })).toHaveAttribute('href', `/teacher/trips/${TRIP_A}/report`)
  await expect(page.getByText('Cập nhật mỗi 5 giây')).toHaveCount(0)
  let last = -1
  await expect.poll(() => {
    const stable = calls.live[TRIP_A] === last && (calls.live[TRIP_A] ?? 0) > 0
    last = calls.live[TRIP_A] ?? 0
    return stable
  }).toBeTruthy()
  const settled = calls.live[TRIP_A] ?? 0
  await page.clock.fastForward(20_000)
  expect(calls.live[TRIP_A] ?? 0).toBe(settled)
})

test('report page keeps the frozen snapshot when the live board later changes', async ({ page }) => {
  const seeded = twoTrips()
  const report = snapshotReport(TRIP_A, 'Địa đạo buổi sáng')
  await seed(page)
  await mockFieldTrips(page, {
    trips: [{ ...seeded.trips[0], status: 'COMPLETED' }, seeded.trips[1]],
    boards: seeded.boards,
    reports: { [TRIP_A]: report },
  })
  await page.clock.install()
  await page.goto(`/teacher/trips/${TRIP_A}/report`)
  await expect(page.getByRole('heading', { name: 'Địa đạo buổi sáng' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Tổ chung' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '40' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '27' })).toBeVisible()
  seeded.boards[TRIP_A].rows = [{ ...sharedRow, stationsCompleted: 9, points: 909 }]
  await page.clock.fastForward(15_000)
  await expect(page.getByText('909')).toHaveCount(0)
  await expect(page.getByRole('cell', { name: '40' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '6' })).toBeVisible()
})

test('buildFieldTripCsv escapes commas and quotes and uses a Vietnamese header', async () => {
  const { buildFieldTripCsv } = await import('../../src/features/field-trips/reportExport.ts')
  const csv = buildFieldTripCsv({
    tripId: TRIP_A,
    title: 'Địa đạo buổi sáng',
    siteCode: 'cu-chi',
    questId: QUEST_ID,
    campaignId: CAMPAIGN_ID,
    status: 'COMPLETED',
    generatedAt: GENERATED_AT,
    groups: [
      {
        groupId: GROUP_SHARED,
        name: 'Com,ma',
        participationMode: 'SHARED_DEVICE',
        headcount: 12,
        stationsCompleted: 3,
        questCompletions: 1,
        points: 40,
      },
      {
        groupId: GROUP_INDIV,
        name: 'Say "hi"',
        participationMode: 'INDIVIDUAL',
        headcount: 1,
        stationsCompleted: 2,
        questCompletions: 0,
        points: 10,
      },
      {
        groupId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        name: 'Dòng\nmới',
        participationMode: 'INDIVIDUAL',
        headcount: 2,
        stationsCompleted: 0,
        questCompletions: 0,
        points: 0,
      },
    ],
  })
  expect(csv).toBe([
    'Nhóm,Hình thức,Sĩ số,Trạm hoàn thành,Hoàn thành nhiệm vụ,Điểm',
    '"Com,ma",Một thiết bị,12,3,1,40',
    '"Say ""hi""",Cá nhân,1,2,0,10',
    '"Dòng\nmới",Cá nhân,2,0,0,0',
  ].join('\n'))
})

test('report CSV download uses the escaped snapshot', async ({ page }) => {
  await seed(page)
  await mockFieldTrips(page, {
    trips: [trip({ id: TRIP_A, title: 'Địa đạo buổi sáng', status: 'COMPLETED' })],
    reports: {
      [TRIP_A]: {
        ...snapshotReport(TRIP_A, 'Địa đạo buổi sáng'),
        groups: [{
          groupId: GROUP_SHARED,
          name: 'Com,ma',
          participationMode: 'SHARED_DEVICE',
          headcount: 12,
          stationsCompleted: 3,
          questCompletions: 1,
          points: 40,
        }],
      },
    },
  })
  await page.goto(`/teacher/trips/${TRIP_A}/report`)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải CSV' }).click()
  const file = await downloadPromise
  expect(file.suggestedFilename()).toBe(`bao-cao-${TRIP_A}.csv`)
  const stream = await file.createReadStream()
  expect(stream).toBeTruthy()
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  expect(Buffer.concat(chunks).toString('utf8')).toContain('"Com,ma",Một thiết bị,12,3,1,40')
})

test('trip live and report text omit email, photoUrl, and @', async ({ page }) => {
  const seeded = twoTrips()
  await seed(page)
  await mockFieldTrips(page, {
    trips: [{ ...seeded.trips[0], status: 'COMPLETED' }, seeded.trips[1]],
    boards: {
      ...seeded.boards,
      [TRIP_A]: { status: 'COMPLETED', rows: [individualRow, sharedRow] },
    },
    reports: { [TRIP_A]: snapshotReport(TRIP_A, 'Địa đạo buổi sáng') },
  })
  for (const path of [`/teacher/trips/${TRIP_A}/live`, `/teacher/trips/${TRIP_A}/report`]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Địa đạo buổi sáng' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Tổ chung' }).first()).toBeVisible()
    const text = await page.locator('main').innerText()
    expect(text.toLowerCase()).not.toContain('email')
    expect(text).not.toContain('photoUrl')
    expect(text).not.toContain('@')
  }
})

test('report explains that the trip must be completed before a snapshot exists', async ({ page }) => {
  await seed(page)
  await mockFieldTrips(page, {
    trips: [trip({ id: TRIP_A, title: 'Địa đạo buổi sáng', status: 'ACTIVE' })],
    reportError: 'Báo cáo chỉ có sau khi kết thúc chuyến',
  })
  await page.goto(`/teacher/trips/${TRIP_A}/report`)
  await expect(page.getByRole('alert')).toContainText('Báo cáo chỉ có sau khi kết thúc chuyến')
  await expect(page.getByRole('button', { name: 'Tải CSV' })).toHaveCount(0)
})

test('print uses the browser print dialog', async ({ page }) => {
  await seed(page)
  await page.addInitScript(() => {
    const target = window as Window & { __printCalls?: number }
    target.__printCalls = 0
    window.print = () => {
      target.__printCalls = (target.__printCalls ?? 0) + 1
    }
  })
  await mockFieldTrips(page, {
    trips: [trip({ id: TRIP_A, title: 'Địa đạo buổi sáng', status: 'COMPLETED' })],
    reports: { [TRIP_A]: snapshotReport(TRIP_A, 'Địa đạo buổi sáng') },
  })
  await page.goto(`/teacher/trips/${TRIP_A}/report`)
  await page.getByRole('button', { name: 'In / Lưu PDF' }).click()
  await expect.poll(() => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls ?? 0)).toBe(1)
})

test('org live board selects a trip and the detail page can complete it', async ({ page }) => {
  const seeded = twoTrips()
  await seed(page)
  await mockFieldTrips(page, {
    trips: [{ ...seeded.trips[0], status: 'ACTIVE', rowVersion: 7 }, seeded.trips[1]],
    boards: seeded.boards,
  })
  await page.goto('/teacher/live-board')
  await page.getByLabel('Chuyến đi').selectOption(TRIP_A)
  await expect(page).toHaveURL(new RegExp(`/teacher/trips/${TRIP_A}/live$`))
  await expect(page.getByRole('heading', { name: 'Địa đạo buổi sáng' })).toBeVisible()
  await expect(page.getByText('org-student@example.invalid')).toHaveCount(0)

  await page.goto(`/teacher/trips/${TRIP_A}`)
  await expect(page.getByRole('link', { name: 'Live board' })).toHaveAttribute('href', `/teacher/trips/${TRIP_A}/live`)
  await expect(page.getByRole('link', { name: 'Báo cáo' })).toHaveAttribute('href', `/teacher/trips/${TRIP_A}/report`)
  const complete = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/teacher/field-trips/${TRIP_A}/complete`)
  await page.getByRole('button', { name: 'Kết thúc chuyến' }).click()
  expect((await complete).postDataJSON()).toEqual({ rowVersion: 7 })
  await expect(page.getByText('Trạng thái: Đã kết thúc')).toBeVisible()
})
