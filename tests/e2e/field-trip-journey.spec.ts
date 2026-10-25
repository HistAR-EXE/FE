import { expect, test, type Page, type Request } from '@playwright/test'
import { STORAGE_KEYS } from '../helpers/constants.ts'

const SITE = 'cu-chi'
const ORG_ID = '22222222-2222-4222-8222-222222222222'
const QUEST_ID = '33333333-3333-4333-8333-333333333333'
const CAMPAIGN_ID = '44444444-4444-4444-8444-444444444444'
const TRIP_B = '66666666-6666-4666-8666-666666666666'
const GROUP_B = '99999999-9999-4999-8999-999999999999'
const CREATED_ID = '77777777-7777-4777-8777-777777777777'
const SECOND_ID = '88888888-8888-4888-8888-888888888881'
const JOIN_A = 'CUCHI8A'
const JOIN_B = 'OTHER26'
const VISIT_START = '2026-11-02T01:30:00.000Z'
const VISIT_END = '2026-11-02T04:30:00.000Z'
const LEARNER_EMAIL = 'hocsinh.an@example.invalid'
const LEARNER_NAME = 'Học sinh An'
const LEARNER_PHOTO = 'student-photo.jpg'
const LOCATION_ID = '11111111-1111-1111-1111-111111111111'

const TEACHER = actor('11111111-1111-4111-8111-111111111111', 'Cô Lan', 'teacher-e2e@example.invalid', 'TEACHER')
const MANAGER = actor('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Quản lý Củ Chi', 'manager-e2e@example.invalid', 'USER')
const LEARNER = actor('cccccccc-cccc-4ccc-8ccc-cccccccccccc', LEARNER_NAME, LEARNER_EMAIL, 'USER')

type PlatformRole = 'TEACHER' | 'USER'
type TripStatus = 'DRAFT' | 'PENDING_SITE' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
type Confirmation = 'NOT_REQUIRED' | 'PENDING' | 'CONFIRMED' | 'DECLINED'
type Mode = 'INDIVIDUAL' | 'SHARED_DEVICE'

type Actor = {
  id: string
  token: string
  displayName: string
  email: string
  platformRole: PlatformRole
}

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
  learnerEmail: string
  learnerName: string
  photoUrl: string
}

type Group = {
  id: string
  tripId: string
  name: string
  participationMode: Mode
  declaredSize: number | null
  memberIds: string[]
}

type Checkin = { userId: string; stationCode: string; points: number }

type ReportGroup = {
  groupId: string
  name: string
  participationMode: Mode
  headcount: number
  stationsCompleted: number
  questCompletions: number
  points: number
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

function actor(id: string, displayName: string, email: string, platformRole: PlatformRole): Actor {
  return { id, token: `trip-e2e.${id}`, displayName, email, platformRole }
}

test('teacher, site, and learner complete one shared-device visit', async ({ page }) => {
  await installJourneyMock(page)
  await signIn(page, TEACHER)
  await page.goto('/teacher/trips')
  await expect(page.getByRole('heading', { name: 'Chuyến tham quan' })).toBeVisible()

  await page.getByLabel('Tổ chức').selectOption(ORG_ID)
  await page.getByLabel('Mã di tích').fill(SITE)
  await page.getByLabel('Tiêu đề').fill('Tham quan Địa đạo')
  await page.getByLabel('Giờ đến').fill('2026-11-02T08:30')
  await page.getByLabel('Giờ về').fill('2026-11-02T11:30')
  await page.getByLabel('Mã nhiệm vụ').fill(QUEST_ID)
  await page.getByLabel('Mã chiến dịch').fill(CAMPAIGN_ID)
  const create = page.waitForRequest((request) => request.method() === 'POST' && pathname(request) === '/api/teacher/field-trips')
  await page.getByRole('button', { name: 'Tạo chuyến' }).click()
  const createdBody = (await create).postDataJSON() as { siteCode: string; title: string; questId: string; campaignId: string; orgId: string }
  expect(createdBody).toMatchObject({
    orgId: ORG_ID,
    siteCode: SITE,
    title: 'Tham quan Địa đạo',
    questId: QUEST_ID,
    campaignId: CAMPAIGN_ID,
  })

  await page.getByRole('link', { name: 'Tham quan Địa đạo' }).click()
  await expect(page).toHaveURL(new RegExp(`/teacher/trips/${CREATED_ID}$`))
  await expect(page.getByRole('link', { name: new RegExp(`/trip/join/${JOIN_A}`) })).toBeVisible()

  await page.getByLabel('Tên nhóm').fill('Nhóm một máy')
  await page.getByLabel('Hình thức tham gia').selectOption({ label: 'Một thiết bị' })
  await page.getByLabel('Sĩ số dự kiến').fill('28')
  const groupCreate = page.waitForRequest((request) => request.method() === 'POST' && pathname(request) === `/api/teacher/field-trips/${CREATED_ID}/groups`)
  await page.getByRole('button', { name: 'Tạo nhóm' }).click()
  expect((await groupCreate).postDataJSON()).toEqual({
    name: 'Nhóm một máy',
    participationMode: 'SHARED_DEVICE',
    declaredSize: 28,
  })
  await expect(page.getByText('Nhóm một máy · Một thiết bị · sĩ số 28 · 0 thành viên')).toBeVisible()

  await page.getByRole('button', { name: 'Gửi xác nhận di tích' }).click()
  await expect(page.getByText('Trạng thái: Chờ di tích xác nhận')).toBeVisible()

  await signIn(page, MANAGER)
  await page.goto('/site-workspace')
  await expect(page.getByText('Vai trò của bạn: Quản lý di tích')).toBeVisible()
  const listed = page.waitForResponse((response) => response.request().method() === 'GET' && pathname(response.request()).endsWith(`/site-workspaces/${SITE}/field-trips`))
  await page.getByRole('tab', { name: 'Vận hành' }).click()
  const schedule = (await (await listed).json()) as { data: Array<Record<string, unknown>> }
  assertNoStudentPii(JSON.stringify(schedule))
  for (const item of schedule.data) {
    expect(Object.keys(item).every((key) => SCHEDULE_KEYS.has(key))).toBe(true)
    expect(item).not.toHaveProperty('learnerEmail')
    expect(item).not.toHaveProperty('photoUrl')
  }
  const pending = schedule.data.find((item) => item.title === 'Tham quan Địa đạo')
  expect(pending).toMatchObject({ status: 'PENDING_SITE', siteConfirmationStatus: 'PENDING', groupCount: 1 })

  const trips = page.getByRole('region', { name: 'Chuyến đi' })
  await expect(trips).toBeVisible()
  assertNoStudentPii(await trips.innerText())
  const card = trips.getByRole('article', { name: 'Tham quan Địa đạo' })
  const confirm = page.waitForRequest((request) => request.method() === 'POST' && pathname(request).endsWith(`/field-trips/${CREATED_ID}/confirm`))
  await card.getByRole('button', { name: 'Xác nhận' }).click()
  const confirmRequest = await confirm
  expect(confirmRequest.headers().authorization).toBe(`Bearer ${MANAGER.token}`)
  expect(confirmRequest.postDataJSON()).toEqual({ rowVersion: pending?.rowVersion })
  await expect(card.getByText('Đã xác nhận', { exact: true })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Xác nhận' })).toHaveCount(0)

  await signIn(page, LEARNER)
  await page.goto(`/trip/join/${JOIN_A}`)
  await expect(page.getByRole('heading', { name: 'Tham quan Địa đạo' })).toBeVisible()
  await page.getByRole('radio', { name: /Nhóm một máy/ }).check()
  await page.getByRole('button', { name: 'Tham gia nhóm' }).click()
  await expect(page.getByText('Đã tham gia nhóm')).toBeVisible()

  await signIn(page, TEACHER)
  await page.goto(`/teacher/trips/${CREATED_ID}`)
  await page.getByRole('button', { name: 'Bắt đầu chuyến' }).click()
  await expect(page.getByText('Trạng thái: Đang diễn ra')).toBeVisible()

  await signIn(page, LEARNER)
  await page.goto('/scan')
  await expect(page.getByRole('heading', { name: 'Quét trạm Củ Chi' })).toBeVisible()
  const checkin = page.waitForRequest((request) => request.method() === 'POST' && pathname(request) === '/api/checkins')
  await page.getByLabel('Mã di tích').fill('cu-chi:ST01:0:ab')
  await page.getByRole('button', { name: 'Check-in ngay' }).click()
  expect((await checkin).postDataJSON()).toMatchObject({ stationCode: 'ST01' })

  await signIn(page, TEACHER)
  await page.goto(`/teacher/trips/${CREATED_ID}`)
  await page.getByRole('link', { name: 'Live board' }).click()
  const shared = page.locator('tbody tr', { hasText: 'Nhóm một máy' })
  await expect(shared.locator('td').nth(3)).toHaveText('28')
  await expect(shared.locator('td').nth(4)).toHaveText('1')
  await expect(shared.locator('td').nth(5)).toHaveText('25')
  await expect(page.getByText('Chuyến lớp khác')).toHaveCount(0)

  await page.goto('/teacher/trips')
  await page.getByRole('link', { name: 'Chuyến lớp khác' }).click()
  await page.getByRole('link', { name: 'Live board' }).click()
  const other = page.locator('tbody tr', { hasText: 'Nhóm khác' })
  await expect(other.locator('td').nth(3)).toHaveText('10')
  await expect(other.locator('td').nth(4)).toHaveText('0')
  await expect(other.locator('td').nth(5)).toHaveText('0')
  await expect(other).not.toContainText('25')

  await page.goto(`/teacher/trips/${CREATED_ID}`)
  await page.getByRole('button', { name: 'Kết thúc chuyến' }).click()
  await expect(page.getByText('Trạng thái: Đã kết thúc')).toBeVisible()
  await page.getByRole('link', { name: 'Báo cáo' }).click()
  const reportRow = page.locator('tbody tr', { hasText: 'Nhóm một máy' })
  await expect(reportRow.locator('td').nth(2)).toHaveText('28')
  await expect(reportRow.locator('td').nth(3)).toHaveText('1')
  await expect(reportRow.locator('td').nth(5)).toHaveText('25')
  assertNoStudentPii(await page.locator('table').innerText())

  const later = await page.evaluate(async ({ token, locationId }) => {
    const checkinResponse = await fetch('/api/checkins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId,
        stationCode: 'ST01',
        qrPayload: 'cu-chi:ST01:0:ab',
        presenceMethod: 'QR',
      }),
    })
    const teacherToken = localStorage.getItem('timelens_token')
    const liveResponse = await fetch('/api/teacher/field-trips/' + '77777777-7777-4777-8777-777777777777' + '/live-board', {
      headers: { Authorization: `Bearer ${teacherToken}` },
    })
    return {
      checkinOk: checkinResponse.ok,
      live: await liveResponse.json() as { data: { rows: Array<{ points: number }> } },
    }
  }, { token: LEARNER.token, locationId: LOCATION_ID })
  expect(later.checkinOk).toBe(true)
  expect(later.live.data.rows[0]?.points).toBe(50)

  await page.reload()
  await expect(reportRow.locator('td').nth(2)).toHaveText('28')
  await expect(reportRow.locator('td').nth(3)).toHaveText('1')
  await expect(reportRow.locator('td').nth(5)).toHaveText('25')
  const report = await page.evaluate(async (tripId) => {
    const token = localStorage.getItem('timelens_token')
    const response = await fetch(`/api/teacher/field-trips/${tripId}/report`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.json() as Promise<unknown>
  }, CREATED_ID)
  assertNoStudentPii(JSON.stringify(report))
})

test('teacher cancels a draft and a declined trip cannot start', async ({ page }) => {
  await installJourneyMock(page)
  await signIn(page, TEACHER)
  await page.goto('/teacher/trips')
  await createTrip(page, 'Chuyến nháp hủy')
  await page.getByRole('link', { name: 'Chuyến nháp hủy' }).click()
  await page.getByRole('button', { name: 'Hủy chuyến' }).click()
  await expect(page.getByText('Trạng thái: Đã hủy')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu chuyến' })).toHaveCount(0)

  await page.goto('/teacher/trips')
  await createTrip(page, 'Chuyến bị từ chối')
  await page.getByRole('link', { name: 'Chuyến bị từ chối' }).click()
  await page.getByRole('button', { name: 'Gửi xác nhận di tích' }).click()
  await expect(page.getByText('Trạng thái: Chờ di tích xác nhận')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu chuyến' })).toHaveCount(0)

  await signIn(page, MANAGER)
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Vận hành' }).click()
  const card = page.getByRole('article', { name: 'Chuyến bị từ chối' })
  await card.getByLabel('Ghi chú từ chối').fill('Trùng lịch')
  const decline = page.waitForRequest((request) => request.method() === 'POST' && pathname(request).endsWith(`/field-trips/${SECOND_ID}/decline`))
  await card.getByRole('button', { name: 'Từ chối' }).click()
  expect((await decline).postDataJSON()).toEqual({ rowVersion: 2, note: 'Trùng lịch' })
  await expect(card.getByRole('button', { name: 'Từ chối' })).toHaveCount(0)

  await signIn(page, TEACHER)
  await page.goto(`/teacher/trips/${SECOND_ID}`)
  await expect(page.getByText('Di tích từ chối')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bắt đầu chuyến' })).toHaveCount(0)
})

const SCHEDULE_KEYS = new Set([
  'id',
  'title',
  'visitStart',
  'visitEnd',
  'status',
  'siteConfirmationStatus',
  'groupCount',
  'rowVersion',
])

function assertNoStudentPii(raw: string) {
  expect(raw).not.toContain('@')
  expect(raw.toLowerCase()).not.toContain('email')
  expect(raw.toLowerCase()).not.toContain('photo')
  expect(raw).not.toContain(LEARNER_NAME)
  expect(raw).not.toContain(LEARNER_PHOTO)
}

function pathname(request: Request) {
  return new URL(request.url()).pathname
}

async function createTrip(page: Page, title: string) {
  await page.getByLabel('Tổ chức').selectOption(ORG_ID)
  await page.getByLabel('Mã di tích').fill(SITE)
  await page.getByLabel('Tiêu đề').fill(title)
  await page.getByLabel('Giờ đến').fill('2026-11-02T08:30')
  await page.getByLabel('Giờ về').fill('2026-11-02T11:30')
  await page.getByLabel('Mã nhiệm vụ').fill(QUEST_ID)
  await page.getByLabel('Mã chiến dịch').fill(CAMPAIGN_ID)
  await page.getByRole('button', { name: 'Tạo chuyến' }).click()
  await expect(page.getByRole('link', { name: title })).toBeVisible()
}

async function signIn(page: Page, person: Actor) {
  await page.goto('/privacy')
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
      'timelens:teacher-onboarding-complete': 'true',
    }
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
  }, { person, storageKeys: STORAGE_KEYS })
}

async function installJourneyMock(page: Page) {
  const state = {
    trips: [otherTrip()] as Trip[],
    groups: [otherGroup()] as Group[],
    checkins: [] as Checkin[],
    reports: {} as Record<string, Report>,
    created: 0,
  }

  await page.route((url) => new URL(url).pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const path = pathname(request)
    const method = request.method()
    const person = actorFrom(request)
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } })
    const fail = (status: number, message: string) => route.fulfill({
      status,
      json: { success: false, code: status === 409 ? 'VERSION_CONFLICT' : 'BUSINESS_RULE', message },
    })

    if (path === '/api/profile/me' && method === 'GET') {
      return ok({
        id: person.id,
        email: person.email,
        displayName: person.displayName,
        avatarUrl: null,
        role: person.platformRole,
        tier: 'PREMIUM',
        orgId: person.platformRole === 'TEACHER' ? ORG_ID : null,
        orgName: person.platformRole === 'TEACHER' ? 'Lớp 6A' : null,
        orgSubscription: person.platformRole === 'TEACHER' ? 'STANDARD' : 'NONE',
        orgRole: person.platformRole === 'TEACHER' ? 'teacher' : null,
        level: 1,
        totalPoints: 0,
        city: null,
        emailVerified: true,
      })
    }
    if (path === '/api/org/mine' && method === 'GET') {
      return ok(person.platformRole === 'TEACHER'
        ? [{ organizationId: ORG_ID, name: 'Lớp 6A', orgRole: 'teacher' }]
        : [])
    }
    if (path === '/api/site-workspaces/mine' && method === 'GET') {
      return ok(person.id === MANAGER.id
        ? [{ siteCode: SITE, locationName: 'Địa đạo Củ Chi', role: 'SITE_MANAGER', requiresTripConfirmation: true }]
        : [])
    }
    const workspace = path.match(/^\/api\/site-workspaces\/([^/]+)$/)
    if (workspace && method === 'GET') {
      return ok({
        siteCode: decodeURIComponent(workspace[1]),
        locationName: 'Địa đạo Củ Chi',
        callerRole: 'SITE_MANAGER',
        requiresTripConfirmation: true,
        members: [],
      })
    }
    if (/^\/api\/site-workspaces\/[^/]+\/content\/versions$/.test(path) && method === 'GET') return ok([])
    if (/^\/api\/sites\/[^/]+\/stations$/.test(path) && method === 'GET') return ok([])
    if (/^\/api\/site-workspaces\/[^/]+\/operations$/.test(path) && method === 'GET') {
      return ok({
        siteCode: SITE,
        from: '',
        to: '',
        visitCount: 0,
        checkinsByStation: [],
        questCompletions: 0,
        contentInteractions: {},
      })
    }

    const decision = path.match(/^\/api\/site-workspaces\/([^/]+)\/field-trips\/([^/]+)\/(confirm|decline)$/)
    if (decision && method === 'POST') {
      const trip = state.trips.find((item) => item.id === decision[2])
      if (!trip) return fail(404, 'Không tìm thấy chuyến đi')
      const body = request.postDataJSON() as { rowVersion?: number; note?: string }
      if (body.rowVersion !== trip.rowVersion) return fail(409, 'Dữ liệu đã thay đổi')
      if (trip.status !== 'PENDING_SITE' || trip.siteConfirmationStatus !== 'PENDING') {
        return fail(422, 'Chuyến đi không đang chờ xác nhận')
      }
      trip.status = decision[3] === 'confirm' ? 'CONFIRMED' : 'DRAFT'
      trip.siteConfirmationStatus = decision[3] === 'confirm' ? 'CONFIRMED' : 'DECLINED'
      trip.siteNote = decision[3] === 'decline' ? (body.note ?? null) : trip.siteNote
      trip.rowVersion += 1
      return ok(publicTrip(trip))
    }
    const siteList = path.match(/^\/api\/site-workspaces\/([^/]+)\/field-trips$/)
    if (siteList && method === 'GET') {
      const site = decodeURIComponent(siteList[1]).toLowerCase()
      return ok(state.trips.filter((trip) => trip.siteCode.toLowerCase() === site).map((trip) => schedule(state, trip)))
    }

    if (path === '/api/teacher/field-trips' && method === 'GET') return ok(state.trips.map(publicTrip))
    if (path === '/api/teacher/field-trips' && method === 'POST') {
      const body = request.postDataJSON() as Partial<Trip>
      const id = state.created === 0 ? CREATED_ID : SECOND_ID
      state.created += 1
      const created = blankTrip({
        id,
        title: body.title ?? 'Chuyến mới',
        status: 'DRAFT',
        orgId: body.orgId ?? ORG_ID,
        siteCode: body.siteCode ?? SITE,
        visitStart: body.visitStart ?? VISIT_START,
        visitEnd: body.visitEnd ?? VISIT_END,
        questId: body.questId ?? QUEST_ID,
        campaignId: body.campaignId ?? CAMPAIGN_ID,
        joinCode: state.created === 1 ? JOIN_A : `JOIN${state.created}`,
        siteConfirmationStatus: 'NOT_REQUIRED',
        rowVersion: 1,
        createdBy: person.id,
      })
      state.trips = [created, ...state.trips]
      return ok(publicTrip(created))
    }

    const groupCreate = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/groups$/)
    if (groupCreate && method === 'POST') {
      const body = request.postDataJSON() as { name: string; participationMode: Mode; declaredSize?: number }
      const created: Group = {
        id: `group-${groupCreate[1]}`,
        tripId: groupCreate[1],
        name: body.name,
        participationMode: body.participationMode,
        declaredSize: body.declaredSize ?? null,
        memberIds: [],
      }
      state.groups = [...state.groups, created]
      return ok(publicGroup(created))
    }

    const transition = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/(request-confirmation|start|cancel|complete)$/)
    if (transition && method === 'POST') {
      const trip = state.trips.find((item) => item.id === transition[1])
      if (!trip) return fail(404, 'Không tìm thấy chuyến đi')
      const body = request.postDataJSON() as { rowVersion?: number }
      if (body.rowVersion !== trip.rowVersion) return fail(409, 'Dữ liệu đã thay đổi')
      const action = transition[2]
      if (action === 'request-confirmation') {
        if (trip.status !== 'DRAFT') return fail(422, 'Chỉ chuyến nháp mới gửi xác nhận')
        trip.status = 'PENDING_SITE'
        trip.siteConfirmationStatus = 'PENDING'
      } else if (action === 'start') {
        const allowed = trip.status === 'CONFIRMED' || (trip.status === 'DRAFT' && trip.siteConfirmationStatus === 'NOT_REQUIRED')
        if (!allowed) return fail(422, 'Chuyến đi chưa thể bắt đầu')
        trip.status = 'ACTIVE'
      } else if (action === 'cancel') {
        if (trip.status === 'ACTIVE' || trip.status === 'COMPLETED') return fail(422, 'Chỉ hủy được chuyến chưa bắt đầu')
        trip.status = 'CANCELLED'
      } else {
        if (trip.status !== 'ACTIVE') return fail(422, 'Chỉ chuyến đang diễn ra mới được kết thúc')
        trip.status = 'COMPLETED'
        state.reports[trip.id] = buildReport(state, trip)
      }
      trip.rowVersion += 1
      return ok(publicTrip(trip))
    }

    const live = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/live-board$/)
    if (live && method === 'GET') {
      const trip = state.trips.find((item) => item.id === live[1])
      if (!trip) return fail(404, 'Không tìm thấy chuyến đi')
      return ok({
        tripId: trip.id,
        status: trip.status,
        rows: state.groups.filter((group) => group.tripId === trip.id).map((group) => liveRow(state, group)),
      })
    }
    const report = path.match(/^\/api\/teacher\/field-trips\/([^/]+)\/report$/)
    if (report && method === 'GET') {
      const stored = state.reports[report[1]]
      return stored ? ok(stored) : fail(422, 'Báo cáo chỉ có sau khi kết thúc chuyến')
    }
    const one = path.match(/^\/api\/teacher\/field-trips\/([^/]+)$/)
    if (one && method === 'GET') {
      const trip = state.trips.find((item) => item.id === one[1])
      return trip ? ok(publicTrip(trip)) : fail(404, 'Không tìm thấy chuyến đi')
    }

    const preview = path.match(/^\/api\/field-trips\/join\/([^/]+)$/)
    if (preview && method === 'GET') {
      const trip = state.trips.find((item) => item.joinCode === decodeURIComponent(preview[1]))
      if (!trip) return fail(422, 'Mã chuyến không hợp lệ')
      return ok({
        title: trip.title,
        siteCode: trip.siteCode,
        visitStart: trip.visitStart,
        visitEnd: trip.visitEnd,
        status: trip.status,
        groups: state.groups.filter((group) => group.tripId === trip.id).map(publicGroup),
      })
    }
    if (path === '/api/field-trips/join' && method === 'POST') {
      const body = request.postDataJSON() as { code?: string; groupId?: string }
      const trip = state.trips.find((item) => item.joinCode === body.code)
      if (!trip) return fail(422, 'Mã chuyến không hợp lệ')
      if (trip.status === 'CANCELLED') return fail(422, 'Chuyến đi đã bị hủy')
      if (trip.status === 'COMPLETED') return fail(422, 'Chuyến đi đã kết thúc')
      const group = state.groups.find((item) => item.id === body.groupId && item.tripId === trip.id)
      if (!group) return fail(422, 'Không tìm thấy nhóm')
      if (!group.memberIds.includes(person.id)) group.memberIds.push(person.id)
      return ok(publicGroup(group))
    }

    if (path === '/api/checkins' && method === 'POST') {
      const body = request.postDataJSON() as { stationCode?: string }
      const stationCode = (body.stationCode || 'ST01').toUpperCase()
      state.checkins.push({ userId: person.id, stationCode, points: 25 })
      return ok({
        success: true,
        distanceMeters: 12,
        questsCompleted: [],
        badgesEarned: [],
        secretUnlocked: false,
        bonusXpAwarded: 0,
        recorded: true,
        xpEarned: 25,
        newArtifacts: [],
        questProgress: null,
      })
    }
    if (path === '/api/checkins/history' && method === 'GET') return ok([])
    if (path === '/api/me/visit-sessions/start' && method === 'POST') {
      const body = request.postDataJSON() as { locationId?: string; mode?: string }
      return ok({ id: 'visit-e2e', locationId: body.locationId ?? LOCATION_ID, mode: body.mode ?? 'online' })
    }

    if (method !== 'GET' && method !== 'HEAD') return ok({})
    return ok([])
  })
}

function actorFrom(request: Request): Actor {
  const header = request.headers().authorization ?? ''
  return [TEACHER, MANAGER, LEARNER].find((person) => header.endsWith(person.token)) ?? LEARNER
}

function blankTrip(partial: Partial<Trip> & Pick<Trip, 'id' | 'title' | 'status'>): Trip {
  return {
    orgId: ORG_ID,
    siteCode: SITE,
    visitStart: VISIT_START,
    visitEnd: VISIT_END,
    questId: QUEST_ID,
    campaignId: CAMPAIGN_ID,
    joinCode: JOIN_B,
    siteConfirmationStatus: 'NOT_REQUIRED',
    siteNote: null,
    createdBy: TEACHER.id,
    createdAt: '2026-10-24T01:00:00.000Z',
    updatedAt: '2026-10-24T01:00:00.000Z',
    rowVersion: 4,
    learnerEmail: LEARNER_EMAIL,
    learnerName: LEARNER_NAME,
    photoUrl: LEARNER_PHOTO,
    ...partial,
  }
}

function otherTrip(): Trip {
  return blankTrip({
    id: TRIP_B,
    title: 'Chuyến lớp khác',
    status: 'ACTIVE',
    joinCode: JOIN_B,
    siteConfirmationStatus: 'CONFIRMED',
    rowVersion: 4,
  })
}

function otherGroup(): Group {
  return {
    id: GROUP_B,
    tripId: TRIP_B,
    name: 'Nhóm khác',
    participationMode: 'SHARED_DEVICE',
    declaredSize: 10,
    memberIds: [],
  }
}

function publicTrip(trip: Trip) {
  return {
    id: trip.id,
    orgId: trip.orgId,
    siteCode: trip.siteCode,
    title: trip.title,
    visitStart: trip.visitStart,
    visitEnd: trip.visitEnd,
    questId: trip.questId,
    campaignId: trip.campaignId,
    joinCode: trip.joinCode,
    status: trip.status,
    siteConfirmationStatus: trip.siteConfirmationStatus,
    siteNote: trip.siteNote,
    createdBy: trip.createdBy,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
    rowVersion: trip.rowVersion,
  }
}

function publicGroup(group: Group) {
  return {
    id: group.id,
    name: group.name,
    participationMode: group.participationMode,
    declaredSize: group.declaredSize,
    memberCount: group.memberIds.length,
  }
}

function schedule(state: { groups: Group[] }, trip: Trip) {
  return {
    id: trip.id,
    title: trip.title,
    visitStart: trip.visitStart,
    visitEnd: trip.visitEnd,
    status: trip.status,
    siteConfirmationStatus: trip.siteConfirmationStatus,
    groupCount: state.groups.filter((group) => group.tripId === trip.id).length,
    rowVersion: trip.rowVersion,
  }
}

function statsFor(state: { checkins: Checkin[] }, group: Group) {
  const mine = state.checkins.filter((item) => group.memberIds.includes(item.userId))
  return {
    stations: new Set(mine.map((item) => item.stationCode)).size,
    points: mine.reduce((sum, item) => sum + item.points, 0),
  }
}

function liveRow(state: { checkins: Checkin[] }, group: Group) {
  const stats = statsFor(state, group)
  return {
    groupId: group.id,
    groupName: group.name,
    participationMode: group.participationMode,
    userId: null,
    displayName: group.name,
    headcount: group.participationMode === 'SHARED_DEVICE' ? group.declaredSize ?? 0 : group.memberIds.length,
    stationsCompleted: stats.stations,
    points: stats.points,
  }
}

function buildReport(state: { groups: Group[]; checkins: Checkin[] }, trip: Trip): Report {
  return {
    tripId: trip.id,
    title: trip.title,
    siteCode: trip.siteCode,
    questId: trip.questId,
    campaignId: trip.campaignId,
    status: trip.status,
    generatedAt: '2026-11-02T05:00:00.000Z',
    groups: state.groups.filter((group) => group.tripId === trip.id).map((group) => {
      const stats = statsFor(state, group)
      return {
        groupId: group.id,
        name: group.name,
        participationMode: group.participationMode,
        headcount: group.participationMode === 'SHARED_DEVICE' ? group.declaredSize ?? 0 : group.memberIds.length,
        stationsCompleted: stats.stations,
        questCompletions: stats.stations > 0 ? 1 : 0,
        points: stats.points,
      }
    }),
  }
}
