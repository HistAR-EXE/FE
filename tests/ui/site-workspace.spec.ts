import { expect, test, type Page, type Route } from '@playwright/test'
import { STORAGE_KEYS } from '../helpers/constants.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999'
const MEMBER_ID = '33333333-3333-4333-8333-333333333333'
const SITE = 'imperial-city'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoaXN0YXItc2l0ZSIsInJvbGUiOiJVU0VSIiwiZXhwIjo0MDcwOTA4ODAwfQ.e2efakesig'

type Membership = {
  siteCode: string
  locationName: string
  role: 'SITE_MANAGER' | 'CONTENT_EDITOR' | 'CONTENT_REVIEWER'
  requiresTripConfirmation: boolean
}

type MockVersion = {
  id: string
  siteCode: string
  contentKind: 'SITE_PROFILE' | 'STATION'
  resourceKey: string
  version: number
  status: string
  snapshotJson: string
  revision: number
  createdBy: string
  submittedBy: string | null
  reviewedBy: string | null
  publishedBy: string | null
  reviewNote: string | null
}

type MockOptions = {
  memberships?: Membership[]
  versions?: MockVersion[]
  denySelfReview?: boolean
  crossSiteDenied?: boolean
  rejectInvalidBlock?: boolean
}

const editorMembership: Membership = {
  siteCode: SITE,
  locationName: 'Hoàng thành Huế',
  role: 'CONTENT_EDITOR',
  requiresTripConfirmation: false,
}

function version(partial: Partial<MockVersion> & Pick<MockVersion, 'contentKind' | 'resourceKey' | 'status'>): MockVersion {
  return {
    id: partial.id ?? 'ver-seed',
    siteCode: SITE,
    version: partial.version ?? 1,
    snapshotJson: partial.snapshotJson ?? JSON.stringify({ name: 'Hồ sơ chờ' }),
    revision: partial.revision ?? 1,
    createdBy: partial.createdBy ?? OTHER_USER_ID,
    submittedBy: partial.submittedBy ?? OTHER_USER_ID,
    reviewedBy: partial.reviewedBy ?? null,
    publishedBy: partial.publishedBy ?? null,
    reviewNote: partial.reviewNote ?? null,
    ...partial,
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ storageKeys, token, userId }) => {
    const entries: Record<string, string> = {
      [storageKeys.token]: token,
      [storageKeys.userId]: userId,
      [storageKeys.displayName]: 'Biên tập di tích',
      [storageKeys.email]: 'site-editor@example.invalid',
      [storageKeys.role]: 'USER',
      [storageKeys.tier]: 'PREMIUM',
      timelens_email_verified: '1',
      [storageKeys.mode]: 'online',
      histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }),
      sidenav_collapsed: 'false',
    }
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
  }, { storageKeys: STORAGE_KEYS, token: TOKEN, userId: USER_ID })
})

test('editor drafts and submits site profile and ST01', async ({ page }) => {
  await mockSiteApi(page)
  await page.goto('/site-workspace')
  await expect(page.getByRole('heading', { name: 'Quản lý di tích', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Quản lý di tích' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Hồ sơ di tích' })).toBeVisible()

  await page.getByLabel('Tên di tích').fill('Hoàng thành mới')
  await page.getByLabel('Mô tả').fill('Mô tả mới')
  await page.getByLabel('Địa chỉ').fill('Huế')
  await page.getByLabel('Ảnh bìa').fill('https://cdn.example/cover.jpg')
  await page.getByLabel('Nguồn').fill('Đại Nam thực lục')
  const createProfile = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/site-workspaces/${SITE}/content/SITE_PROFILE/profile/versions`)
  await page.getByRole('button', { name: 'Lưu nháp' }).click()
  expect((await createProfile).postDataJSON()).toMatchObject({
    snapshot: { name: 'Hoàng thành mới', description: 'Mô tả mới', formattedAddress: 'Huế', coverImage: 'https://cdn.example/cover.jpg', sources: 'Đại Nam thực lục' },
  })
  await expect(page.getByText('Đã lưu bản nháp phiên bản 1')).toBeVisible()

  const submitProfile = page.waitForRequest((request) =>
    request.method() === 'POST' && /\/content\/SITE_PROFILE\/profile\/versions\/\d+\/submit$/.test(new URL(request.url()).pathname))
  await page.getByRole('button', { name: 'Gửi duyệt' }).click()
  expect((await submitProfile).postDataJSON()).toMatchObject({ expectedRevision: expect.any(Number) })
  await expect(page.getByText('Đã gửi duyệt hồ sơ phiên bản 1')).toBeVisible()

  await page.getByRole('tab', { name: 'Trạm' }).click()
  await page.getByLabel('Tên trạm').fill('Cổng mới')
  await page.getByLabel('Thứ tự').fill('2')
  await page.getByLabel('Vĩ độ').fill('16.47')
  await page.getByLabel('Kinh độ').fill('107.58')
  await page.getByLabel('Khóa bước nhiệm vụ').fill('gate-2')
  await page.getByLabel('Đang hoạt động').check()
  await page.getByLabel('Tiêu đề block').fill('Dẫn chuyện')
  await page.getByLabel('Nội dung block').fill('Nội dung trạm')
  await page.getByLabel('URL phương tiện').fill('https://cdn.example/clip.mp4')
  const createStation = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/site-workspaces/${SITE}/content/STATION/ST01/versions`)
  await page.getByRole('button', { name: 'Lưu nháp' }).click()
  expect((await createStation).postDataJSON()).toMatchObject({
    snapshot: { stationCode: 'ST01', name: 'Cổng mới', sortOrder: 2, lat: 16.47, lng: 107.58, questStepKey: 'gate-2', active: true },
  })
  await expect(page.getByText('Đã lưu bản nháp trạm ST01')).toBeVisible()

  const submitStation = page.waitForRequest((request) =>
    request.method() === 'POST' && /\/content\/STATION\/ST01\/versions\/\d+\/submit$/.test(new URL(request.url()).pathname))
  await page.getByRole('button', { name: 'Gửi duyệt' }).click()
  expect((await submitStation).postDataJSON()).toMatchObject({ expectedRevision: expect.any(Number) })
  await expect(page.getByText('Đã gửi duyệt trạm ST01 phiên bản 1')).toBeVisible()
})

test('reviewer approves and manager publishes the queue', async ({ page }) => {
  await mockSiteApi(page, {
    memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }],
    versions: [version({ contentKind: 'SITE_PROFILE', resourceKey: 'profile', status: 'IN_REVIEW' })],
  })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Chờ duyệt' }).click()
  await expect(page.getByRole('heading', { name: 'Hồ sơ di tích · phiên bản 1' })).toBeVisible()
  const review = page.waitForRequest((request) => request.method() === 'POST' && request.url().includes('/review'))
  await page.getByRole('button', { name: 'Phê duyệt' }).click()
  expect((await review).postDataJSON()).toMatchObject({ decision: 'APPROVE', expectedRevision: 1 })
  const publish = page.waitForRequest((request) => request.method() === 'POST' && request.url().includes('/publish'))
  await page.getByRole('button', { name: 'Phát hành' }).click()
  expect((await publish).postDataJSON()).toMatchObject({ expectedRevision: 2 })
  await expect(page.getByText('Đã phát hành phiên bản 1')).toBeVisible()
})

test('manager updates members and trip confirmation', async ({ page }) => {
  await mockSiteApi(page, { memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }] })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Thành viên' }).click()
  await page.getByLabel('Mã người dùng').fill(MEMBER_ID)
  await page.getByLabel('Vai trò').selectOption('CONTENT_REVIEWER')
  const saveMember = page.waitForRequest((request) => request.method() === 'PUT' && request.url().includes('/members'))
  await page.getByRole('button', { name: 'Lưu thành viên' }).click()
  expect((await saveMember).postDataJSON()).toEqual({ userId: MEMBER_ID, role: 'CONTENT_REVIEWER' })
  await expect(page.getByRole('listitem').filter({ hasText: MEMBER_ID })).toContainText('Người duyệt')

  const saveSettings = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes('/settings'))
  await page.getByLabel('Yêu cầu xác nhận chuyến đi').check()
  expect((await saveSettings).postDataJSON()).toEqual({ requiresTripConfirmation: true })
  await expect(page.getByText('Đã cập nhật xác nhận chuyến đi')).toBeVisible()
})

test('editor requests a static station QR without a secret field', async ({ page }) => {
  await mockSiteApi(page)
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Trạm' }).click()
  const qr = page.waitForRequest((request) => request.method() === 'GET' && request.url().includes('/stations/ST01/qr'))
  await page.getByRole('button', { name: 'Lấy QR tĩnh' }).click()
  expect(new URL((await qr).url()).searchParams.get('static')).toBe('true')
  await expect(page.getByLabel('Nội dung QR')).toHaveText('histar://imperial-city/ST01')
  await expect(page.locator('input[name*="hmac" i], input[name*="secret" i]')).toHaveCount(0)
  await expect(page.getByText('should-not-render-hmac')).toHaveCount(0)
  await expect(page.getByText('hmacSecret')).toHaveCount(0)
})

test('self-review denial shows the API error', async ({ page }) => {
  await mockSiteApi(page, {
    memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }],
    denySelfReview: true,
    versions: [version({ contentKind: 'SITE_PROFILE', resourceKey: 'profile', status: 'IN_REVIEW', submittedBy: USER_ID, createdBy: USER_ID })],
  })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Chờ duyệt' }).click()
  await page.getByRole('button', { name: 'Phê duyệt' }).click()
  await expect(page.getByRole('alert')).toContainText('Không thể tự duyệt nội dung do chính mình gửi')
})

test('cross-site denial shows the API error outside the admin console', async ({ page }) => {
  await mockSiteApi(page, {
    crossSiteDenied: true,
    memberships: [editorMembership, { siteCode: 'other-site', locationName: 'Di tích khác', role: 'CONTENT_EDITOR', requiresTripConfirmation: false }],
  })
  await page.goto('/site-workspace')
  await expect(page.getByRole('tab', { name: 'Hồ sơ di tích' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Di tích', exact: true }).selectOption('other-site')
  await expect(page.getByRole('alert')).toContainText('Không có quyền truy cập site workspace này')
  await expect(page).toHaveURL(/\/site-workspace$/)
  await expect(page.getByRole('heading', { name: 'Bàn điều hành' })).toHaveCount(0)
})

test('station validation error names the block and reveals that snapshot', async ({ page }) => {
  await mockSiteApi(page, { rejectInvalidBlock: true })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Trạm' }).click()
  await page.getByLabel('Loại block').selectOption('IMAGE')
  await page.getByLabel('URL phương tiện').fill('')
  await page.getByRole('button', { name: 'Lưu nháp' }).click()
  await expect(page.getByRole('alert')).toContainText('Block IMAGE cần mediaUrl')
  await expect(page.getByLabel('Snapshot block lỗi')).toContainText('"blockType": "IMAGE"')
})

test('operations tab renders aggregates only', async ({ page }) => {
  await mockSiteApi(page, { memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }] })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Vận hành' }).click()
  await expect(page.getByText('Lượt tham quan', { exact: true })).toBeVisible()
  await expect(page.getByText('12', { exact: true })).toBeVisible()
  await expect(page.getByText('ST01: 9')).toBeVisible()
  await expect(page.getByText('Hoàn thành nhiệm vụ', { exact: true })).toBeVisible()
  await expect(page.getByText('4', { exact: true })).toBeVisible()
  await expect(page.getByText('video: 3')).toBeVisible()
  const text = await page.locator('body').innerText()
  expect(text).not.toContain('user-secret-id')
  expect(text).not.toContain('visitor@secret.example')
  expect(text).not.toContain('photo-secret.jpg')
  expect(text).not.toContain('chat-secret-transcript')
  expect(text).not.toContain('score-secret-99')
})

test('site workspace nav stays hidden without a membership', async ({ page }) => {
  await mockSiteApi(page, { memberships: [] })
  await page.goto('/site-workspace')
  await expect(page.getByRole('heading', { name: 'Quản lý di tích', exact: true })).toBeVisible()
  await expect(page.getByText('Bạn chưa được phân quyền quản lý di tích nào.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Quản lý di tích' })).toHaveCount(0)
  await expect(page).toHaveURL(/\/site-workspace$/)
  await expect(page.getByRole('heading', { name: 'Bàn điều hành' })).toHaveCount(0)
})

async function mockSiteApi(page: Page, options: MockOptions = {}) {
  const memberships = options.memberships ?? [editorMembership]
  const state = {
    versions: [...(options.versions ?? [])],
    members: [{ userId: '22222222-2222-4222-8222-222222222222', role: 'CONTENT_EDITOR', active: true }],
    requiresTripConfirmation: false,
    seq: 1,
  }

  await page.route((url) => new URL(url).pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data } })
    const fail = (status: number, message: string) => route.fulfill({
      status,
      json: { success: false, code: status === 403 ? 'FORBIDDEN' : 'BUSINESS_RULE', message },
    })

    if (path === '/api/profile/me') {
      return ok({
        id: USER_ID,
        email: 'site-editor@example.invalid',
        displayName: 'Biên tập di tích',
        avatarUrl: null,
        role: 'USER',
        tier: 'PREMIUM',
        orgId: null,
        orgName: null,
        orgSubscription: 'NONE',
        orgRole: null,
        level: 1,
        totalPoints: 0,
        city: null,
        emailVerified: true,
      })
    }
    if (options.crossSiteDenied && path.includes('/other-site')) {
      return fail(403, 'Không có quyền truy cập site workspace này')
    }
    if (path === '/api/site-workspaces/mine') return ok(memberships)

    const workspace = path.match(/^\/api\/site-workspaces\/([^/]+)$/)
    if (workspace && method === 'GET') {
      const site = decodeURIComponent(workspace[1])
      const membership = memberships.find((item) => item.siteCode === site)
      return ok({
        siteCode: site,
        locationName: membership?.locationName ?? site,
        callerRole: membership?.role ?? 'CONTENT_EDITOR',
        requiresTripConfirmation: state.requiresTripConfirmation,
        members: membership?.role === 'SITE_MANAGER' ? state.members : null,
      })
    }
    if (/^\/api\/site-workspaces\/[^/]+\/members$/.test(path) && method === 'GET') return ok(state.members)
    if (/^\/api\/site-workspaces\/[^/]+\/members$/.test(path) && method === 'PUT') {
      const body = request.postDataJSON() as { userId: string; role: string }
      const member = { userId: body.userId, role: body.role, active: true }
      state.members = [...state.members.filter((item) => item.userId !== body.userId), member]
      return ok(member)
    }
    const revoke = path.match(/^\/api\/site-workspaces\/[^/]+\/members\/([^/]+)$/)
    if (revoke && method === 'DELETE') {
      state.members = state.members.filter((item) => item.userId !== decodeURIComponent(revoke[1]))
      return ok(null)
    }
    if (/^\/api\/site-workspaces\/[^/]+\/settings$/.test(path) && method === 'PATCH') {
      const body = request.postDataJSON() as { requiresTripConfirmation: boolean }
      state.requiresTripConfirmation = Boolean(body.requiresTripConfirmation)
      return ok({ siteCode: decodeURIComponent(path.split('/')[3]), requiresTripConfirmation: state.requiresTripConfirmation })
    }
    if (/^\/api\/site-workspaces\/[^/]+\/content\/versions$/.test(path) && method === 'GET') {
      const status = url.searchParams.get('status')
      return ok(status ? state.versions.filter((item) => item.status === status) : state.versions)
    }

    const action = path.match(/^\/api\/site-workspaces\/([^/]+)\/content\/(SITE_PROFILE|STATION)\/([^/]+)\/versions(?:\/(\d+)(?:\/(submit|review|publish))?)?$/)
    if (action) {
      return handleContentAction(route, action, method, state, options)
    }

    const qr = path.match(/^\/api\/site-workspaces\/([^/]+)\/stations\/([^/]+)\/qr$/)
    if (qr && method === 'GET') {
      const site = decodeURIComponent(qr[1])
      const station = decodeURIComponent(qr[2])
      return ok({
        siteCode: site,
        stationCode: station,
        timestamp: 1,
        signature: 'sig',
        payload: `histar://${site}/${station}`,
        signed: true,
        staticQr: true,
        hmacSecret: 'should-not-render-hmac',
      })
    }

    const stations = path.match(/^\/api\/sites\/([^/]+)\/stations$/)
    if (stations && method === 'GET') {
      return ok([{
        id: 'station-st01',
        siteCode: decodeURIComponent(stations[1]),
        code: 'ST01',
        name: 'Cổng thành',
        sortOrder: 1,
        lat: 16.467,
        lng: 107.579,
        questStepKey: 'gate',
        active: true,
        blocks: [],
      }])
    }

    if (/^\/api\/site-workspaces\/[^/]+\/operations$/.test(path) && method === 'GET') {
      return ok({
        siteCode: decodeURIComponent(path.split('/')[3]),
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        visitCount: 12,
        checkinsByStation: [{ stationCode: 'ST01', count: 9, userId: 'user-secret-id' }],
        questCompletions: 4,
        contentInteractions: { video: 3 },
        email: 'visitor@secret.example',
        photoUrl: 'photo-secret.jpg',
        chat: 'chat-secret-transcript',
        scores: 'score-secret-99',
      })
    }

    return ok([])
  })
}

function handleContentAction(
  route: Route,
  action: RegExpMatchArray,
  method: string,
  state: { versions: MockVersion[]; seq: number },
  options: MockOptions,
) {
  const ok = (data: unknown) => route.fulfill({ json: { success: true, data } })
  const fail = (status: number, message: string) => route.fulfill({
    status,
    json: { success: false, code: status === 403 ? 'FORBIDDEN' : 'BUSINESS_RULE', message },
  })
  const site = decodeURIComponent(action[1])
  const kind = action[2] as MockVersion['contentKind']
  const resourceKey = decodeURIComponent(action[3])
  const versionNumber = action[4] ? Number(action[4]) : null
  const verb = action[5]
  const body = method === 'GET' ? null : route.request().postDataJSON() as {
    snapshot?: { blocks?: Array<{ blockType?: string; mediaUrl?: string }> }
    decision?: string
    note?: string | null
  }

  if ((method === 'POST' || method === 'PATCH') && !verb && options.rejectInvalidBlock) {
    const blocks = body?.snapshot?.blocks ?? []
    if (blocks.some((block) => block.blockType === 'IMAGE' && !block.mediaUrl)) {
      return fail(422, 'Block IMAGE cần mediaUrl')
    }
  }

  if (method === 'POST' && versionNumber == null) {
    const nextVersion = state.versions
      .filter((item) => item.contentKind === kind && item.resourceKey === resourceKey)
      .reduce((max, item) => Math.max(max, item.version), 0) + 1
    const created = version({
      id: `ver-${state.seq++}`,
      siteCode: site,
      contentKind: kind,
      resourceKey,
      version: nextVersion,
      status: 'DRAFT',
      snapshotJson: JSON.stringify(body?.snapshot ?? {}),
      revision: 1,
      createdBy: USER_ID,
      submittedBy: null,
    })
    state.versions = [created, ...state.versions]
    return ok(created)
  }

  const current = state.versions.find((item) => item.contentKind === kind && item.resourceKey === resourceKey && item.version === versionNumber)
  if (!current) return fail(404, 'Không tìm thấy phiên bản nội dung')
  if (method === 'PATCH' && !verb) {
    current.snapshotJson = JSON.stringify(body?.snapshot ?? {})
    current.revision += 1
    current.status = 'DRAFT'
    return ok({ ...current })
  }
  if (method === 'POST' && verb === 'submit') {
    current.status = 'IN_REVIEW'
    current.submittedBy = USER_ID
    current.revision += 1
    return ok({ ...current })
  }
  if (method === 'POST' && verb === 'review') {
    if (options.denySelfReview) return fail(403, 'Không thể tự duyệt nội dung do chính mình gửi')
    current.status = body?.decision === 'REQUEST_CHANGES' ? 'DRAFT' : 'APPROVED'
    current.reviewedBy = USER_ID
    current.reviewNote = body?.note ?? null
    current.revision += 1
    return ok({ ...current })
  }
  if (method === 'POST' && verb === 'publish') {
    current.status = 'PUBLISHED'
    current.publishedBy = USER_ID
    current.revision += 1
    return ok({ ...current })
  }
  return fail(404, 'Không tìm thấy phiên bản nội dung')
}
