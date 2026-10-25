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

type LiveLocation = {
  name: string
  description: string
  formattedAddress: string
  coverImage: string
  sources?: string
}

type MockOptions = {
  memberships?: Membership[]
  versions?: MockVersion[]
  denySelfReview?: boolean
  crossSiteDenied?: boolean
  rejectInvalidBlock?: boolean
  platformRole?: 'USER' | 'ADMIN'
  failMine?: { current: boolean }
  workspaceProfile?: Partial<LiveLocation>
  liveLocation?: LiveLocation
  locationResponse?: Record<string, unknown>
  holdLocation?: Promise<void>
  stationBlocks?: Array<{
    blockType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'HOTSPOT'
    title: string
    body: string
    mediaUrl: string
    sortOrder: number
    metaJson?: string | null
  }>
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

const publishedProfile = {
  name: 'Hoàng thành đã phát hành',
  description: 'Mô tả đang sống',
  formattedAddress: 'Đại Nội, Huế',
  coverImage: 'https://cdn.example/live-cover.jpg',
  sources: 'Đại Nam thực lục',
}

test('profile editor seeds fields from the latest published snapshot before save', async ({ page }) => {
  await mockSiteApi(page, {
    versions: [version({
      contentKind: 'SITE_PROFILE',
      resourceKey: 'profile',
      status: 'PUBLISHED',
      snapshotJson: JSON.stringify(publishedProfile),
    })],
  })
  await page.goto('/site-workspace')
  await expect(page.getByLabel('Tên di tích')).toHaveValue(publishedProfile.name)
  await expect(page.getByLabel('Mô tả')).toHaveValue(publishedProfile.description)
  await expect(page.getByLabel('Địa chỉ')).toHaveValue(publishedProfile.formattedAddress)
  await expect(page.getByLabel('Ảnh bìa')).toHaveValue(publishedProfile.coverImage)
  await expect(page.getByLabel('Nguồn')).toHaveValue(publishedProfile.sources)
  const createProfile = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/site-workspaces/${SITE}/content/SITE_PROFILE/profile/versions`)
  await page.getByRole('button', { name: 'Lưu nháp' }).click()
  expect((await createProfile).postDataJSON()).toMatchObject({ snapshot: publishedProfile })
})

test('profile editor keeps a draft ahead of the published snapshot', async ({ page }) => {
  await mockSiteApi(page, {
    versions: [
      version({
        id: 'published-profile',
        contentKind: 'SITE_PROFILE',
        resourceKey: 'profile',
        status: 'PUBLISHED',
        version: 3,
        snapshotJson: JSON.stringify(publishedProfile),
      }),
      version({
        id: 'draft-profile',
        contentKind: 'SITE_PROFILE',
        resourceKey: 'profile',
        status: 'DRAFT',
        version: 4,
        snapshotJson: JSON.stringify({ ...publishedProfile, name: 'Bản nháp mới' }),
      }),
    ],
  })
  await page.goto('/site-workspace')
  await expect(page.getByLabel('Tên di tích')).toHaveValue('Bản nháp mới')
})

test('profile editor seeds from the workspace summary when nothing is published', async ({ page }) => {
  await mockSiteApi(page, {
    workspaceProfile: {
      name: 'Tên từ workspace',
      description: 'Mô tả từ workspace',
      formattedAddress: 'Địa chỉ từ workspace',
      coverImage: 'https://cdn.example/workspace.jpg',
      sources: 'Nguồn workspace',
    },
    liveLocation: {
      name: 'Hoàng thành Huế',
      description: 'Không dùng locations',
      formattedAddress: 'Sai địa chỉ',
      coverImage: 'https://cdn.example/wrong.jpg',
      sources: 'Sai nguồn',
    },
  })
  await page.goto('/site-workspace')
  await expect(page.getByLabel('Tên di tích')).toHaveValue('Tên từ workspace')
  await expect(page.getByLabel('Mô tả')).toHaveValue('Mô tả từ workspace')
  await expect(page.getByLabel('Địa chỉ')).toHaveValue('Địa chỉ từ workspace')
  await expect(page.getByLabel('Ảnh bìa')).toHaveValue('https://cdn.example/workspace.jpg')
  await expect(page.getByLabel('Nguồn')).toHaveValue('Nguồn workspace')
})

test('profile editor seeds a location payload without sources and keeps workspace sources', async ({ page }) => {
  const locationResponse = {
    id: '22222222-2222-4222-8222-222222222299',
    name: 'Hoàng thành Huế',
    description: 'Kinh thành nhà Nguyễn',
    latitude: 16.467,
    longitude: 107.579,
    city: 'Huế',
    formattedAddress: 'Đại Nội, Huế',
    googleMapsUrl: 'https://maps.example/hue',
    coverImage: 'https://cdn.example/hue-live.jpg',
    rating: 4.5,
    distanceKm: null,
    isArAvailable: true,
    unlockPrerequisiteQuestId: null,
    unlockNarrative: null,
    isUnlocked: true,
    createdAt: '2020-01-01T00:00:00.000Z',
  }
  expect(locationResponse).not.toHaveProperty('sources')
  await mockSiteApi(page, {
    workspaceProfile: { sources: 'Đại Nam thực lục' },
    locationResponse,
  })
  await page.goto('/site-workspace')
  await expect(page.getByLabel('Mô tả')).toHaveValue('Kinh thành nhà Nguyễn')
  await expect(page.getByLabel('Địa chỉ')).toHaveValue('Đại Nội, Huế')
  await expect(page.getByLabel('Ảnh bìa')).toHaveValue('https://cdn.example/hue-live.jpg')
  await expect(page.getByLabel('Nguồn')).toHaveValue('Đại Nam thực lục')
  const createProfile = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/site-workspaces/${SITE}/content/SITE_PROFILE/profile/versions`)
  await page.getByRole('button', { name: 'Gửi duyệt' }).click()
  expect((await createProfile).postDataJSON().snapshot.sources).toBe('Đại Nam thực lục')
  await expect(page.getByText(/Đã gửi duyệt hồ sơ phiên bản/)).toBeVisible()
  await expect(page.getByLabel('Nguồn')).toHaveValue('Đại Nam thực lục')
  await expect(page.getByLabel('Mô tả')).toHaveValue('Kinh thành nhà Nguyễn')
})

test('profile editor applies an unseen location seed and blocks save until then', async ({ page }) => {
  let release: () => void = () => {}
  const holdLocation = new Promise<void>((resolve) => {
    release = resolve
  })
  await mockSiteApi(page, {
    holdLocation,
    liveLocation: {
      name: 'Hoàng thành Huế',
      description: 'Kinh thành nhà Nguyễn',
      formattedAddress: 'Đại Nội, Huế',
      coverImage: 'https://cdn.example/hue-live.jpg',
    },
  })
  await page.goto('/site-workspace')
  const save = page.getByRole('button', { name: 'Lưu nháp' })
  await expect(save).toBeVisible()
  await expect(save).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Gửi duyệt' })).toBeDisabled()
  await page.getByLabel('Nguồn').fill('gõ khi form còn trống')
  release()
  await expect(page.getByLabel('Mô tả')).toHaveValue('Kinh thành nhà Nguyễn')
  await expect(page.getByLabel('Nguồn')).toHaveValue('')
  await expect(save).toBeEnabled()
})

test('profile editor keeps the submitted snapshot instead of an older published profile', async ({ page }) => {
  await mockSiteApi(page, {
    versions: [version({
      id: 'published-old',
      contentKind: 'SITE_PROFILE',
      resourceKey: 'profile',
      status: 'PUBLISHED',
      version: 3,
      snapshotJson: JSON.stringify({ ...publishedProfile, name: 'Bản đã phát hành cũ', sources: 'Nguồn cũ' }),
    })],
  })
  await page.goto('/site-workspace')
  await expect(page.getByLabel('Tên di tích')).toHaveValue('Bản đã phát hành cũ')
  await expect(page.getByLabel('Nguồn')).toHaveValue('Nguồn cũ')
  await page.getByLabel('Tên di tích').fill('Hồ sơ vừa gửi')
  await page.getByLabel('Nguồn').fill('Nguồn vừa gửi')
  await page.getByRole('button', { name: 'Gửi duyệt' }).click()
  await expect(page.getByText(/Đã gửi duyệt hồ sơ phiên bản/)).toBeVisible()
  await expect(page.getByLabel('Tên di tích')).toHaveValue('Hồ sơ vừa gửi')
  await expect(page.getByLabel('Nguồn')).toHaveValue('Nguồn vừa gửi')
  await expect(page.getByText('Phiên bản 4 · Chờ duyệt')).toBeVisible()
})

test('review queue renders submitted profile and station fields', async ({ page }) => {
  await mockSiteApi(page, {
    memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }],
    versions: [
      version({
        id: 'profile-review',
        contentKind: 'SITE_PROFILE',
        resourceKey: 'profile',
        status: 'IN_REVIEW',
        snapshotJson: JSON.stringify({
          name: 'Hồ sơ chờ duyệt',
          description: 'Mô tả chờ duyệt',
          formattedAddress: 'Địa chỉ chờ duyệt',
        }),
      }),
      version({
        id: 'station-review',
        contentKind: 'STATION',
        resourceKey: 'ST01',
        status: 'IN_REVIEW',
        version: 2,
        snapshotJson: JSON.stringify({
          name: 'Trạm chờ duyệt',
          blocks: [{
            blockType: 'VIDEO',
            title: 'Clip cổng',
            body: 'Lời dẫn trạm',
            mediaUrl: 'https://cdn.example/clip.mp4',
            sortOrder: 0,
          }],
        }),
      }),
    ],
  })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Chờ duyệt' }).click()
  await expect(page.getByText('Mô tả chờ duyệt')).toBeVisible()
  await expect(page.getByText('Địa chỉ chờ duyệt')).toBeVisible()
  await expect(page.getByText('Clip cổng')).toBeVisible()
  await expect(page.getByText('Lời dẫn trạm')).toBeVisible()
  await expect(page.getByText('https://cdn.example/clip.mp4')).toBeVisible()
  const text = await page.locator('body').innerText()
  expect(text).not.toContain('"formattedAddress"')
  expect(text).not.toContain('"blockType"')
  expect(text).not.toContain('"mediaUrl"')
})

test('member role select offers editor and reviewer unless the caller is a platform admin', async ({ page }) => {
  await mockSiteApi(page, { memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }] })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Thành viên' }).click()
  await expect(page.getByLabel('Vai trò').locator('option')).toHaveText(['Biên tập viên', 'Người duyệt'])

  await mockSiteApi(page, { memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }], platformRole: 'ADMIN' })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Thành viên' }).click()
  await expect(page.getByLabel('Vai trò').locator('option')).toHaveText(['Biên tập viên', 'Người duyệt', 'Quản lý di tích'])
})

test('mobile nav shows the workspace link for members only', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockSiteApi(page)
  await page.goto('/site-workspace')
  await expect(page.getByRole('link', { name: 'Quản lý di tích' })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await mockSiteApi(page, { memberships: [] })
  await page.goto('/site-workspace')
  await expect(page.getByRole('link', { name: 'Quản lý di tích' })).toHaveCount(0)
})

test('a failed membership lookup is fetched again on the next visit', async ({ page }) => {
  const failMine = { current: true }
  await mockSiteApi(page, { failMine })
  await page.goto('/site-workspace')
  await expect(page.getByRole('alert')).toContainText('Không tải được quyền di tích')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('link', { name: 'Quản lý di tích' })).toHaveCount(0)
  failMine.current = false
  await page.getByRole('link', { name: 'Khám phá di tích' }).click()
  await expect(page).toHaveURL(/\/explore/)
  await expect(page.getByRole('link', { name: 'Quản lý di tích' })).toBeVisible()
})

test('member changes refetch workspace membership', async ({ page }) => {
  await mockSiteApi(page, { memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }] })
  let mineCount = 0
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/site-workspaces/mine') mineCount += 1
  })
  await page.goto('/site-workspace')
  await expect(page.getByRole('heading', { name: 'Quản lý di tích', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Quản lý di tích' })).toBeVisible()
  const before = mineCount
  await page.getByRole('tab', { name: 'Thành viên' }).click()
  await page.getByLabel('Mã người dùng').fill(MEMBER_ID)
  await page.getByRole('button', { name: 'Lưu thành viên' }).click()
  await expect(page.getByText('Đã cập nhật thành viên')).toBeVisible()
  await expect.poll(() => mineCount).toBeGreaterThan(before)
})

test('station save sends block metaJson without showing it', async ({ page }) => {
  await mockSiteApi(page, {
    stationBlocks: [{
      blockType: 'TEXT',
      title: 'Dẫn cũ',
      body: 'Nội dung cũ',
      mediaUrl: '',
      sortOrder: 0,
      metaJson: '{"hotspot":"gate"}',
    }],
  })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Trạm' }).click()
  await expect(page.getByLabel('Tiêu đề block')).toHaveValue('Dẫn cũ')
  await expect(page.getByText('hotspot')).toHaveCount(0)
  await expect(page.getByText('metaJson')).toHaveCount(0)
  const createStation = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/site-workspaces/${SITE}/content/STATION/ST01/versions`)
  await page.getByRole('button', { name: 'Lưu nháp' }).click()
  expect((await createStation).postDataJSON().snapshot.blocks[0].metaJson).toBe('{"hotspot":"gate"}')
})

test('blank station coordinates are not saved as zero', async ({ page }) => {
  await mockSiteApi(page)
  const posts: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.includes('/content/STATION/')) posts.push(request.url())
  })
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Trạm' }).click()
  await page.getByLabel('Thứ tự').fill('')
  await page.getByLabel('Vĩ độ').fill('')
  await page.getByLabel('Kinh độ').fill('')
  await page.getByRole('button', { name: 'Lưu nháp' }).click()
  await expect(page.getByRole('alert')).toContainText('phải là số')
  expect(posts).toEqual([])
})

test('station blocks can be removed', async ({ page }) => {
  await mockSiteApi(page)
  await page.goto('/site-workspace')
  await page.getByRole('tab', { name: 'Trạm' }).click()
  await page.getByRole('button', { name: 'Xóa block' }).click()
  const createStation = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === `/api/site-workspaces/${SITE}/content/STATION/ST01/versions`)
  await page.getByRole('button', { name: 'Lưu nháp' }).click()
  expect((await createStation).postDataJSON().snapshot.blocks).toEqual([])
})

test.describe('operations local dates', () => {
  test.use({ timezoneId: 'Asia/Ho_Chi_Minh' })

  test('operations tab sends local-date bounds', async ({ page }) => {
    await mockSiteApi(page, { memberships: [{ ...editorMembership, role: 'SITE_MANAGER' }] })
    await page.goto('/site-workspace')
    const ops = page.waitForRequest((request) => request.method() === 'GET' && new URL(request.url()).pathname.endsWith('/operations'))
    await page.getByRole('tab', { name: 'Vận hành' }).click()
    const url = new URL((await ops).url())
    const fromInput = await page.getByLabel('Từ ngày').inputValue()
    const toInput = await page.getByLabel('Đến ngày').inputValue()
    const expected = await page.evaluate(({ from, to }) => {
      const start = (value: string) => {
        const [year, month, day] = value.split('-').map(Number)
        return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString()
      }
      const end = (value: string) => {
        const [year, month, day] = value.split('-').map(Number)
        return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString()
      }
      return { from: start(from), to: end(to) }
    }, { from: fromInput, to: toInput })
    expect(url.searchParams.get('from')).toBe(expected.from)
    expect(url.searchParams.get('to')).toBe(expected.to)
    expect(url.searchParams.get('from')).not.toBe(`${fromInput}T00:00:00.000Z`)
    expect(url.searchParams.get('to')).not.toBe(`${toInput}T23:59:59.999Z`)
  })
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
        role: options.platformRole ?? 'USER',
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
    if (path === '/api/site-workspaces/mine') {
      if (options.failMine?.current) return fail(503, 'Không tải được quyền di tích')
      return ok(memberships)
    }

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
        ...(options.workspaceProfile ?? {}),
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
        blocks: options.stationBlocks ?? [],
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

    if (path === '/api/locations' && method === 'GET' && (options.liveLocation || options.locationResponse || options.holdLocation)) {
      if (options.holdLocation) await options.holdLocation
      const item = options.locationResponse ?? {
        id: '22222222-2222-4222-8222-222222222299',
        latitude: 16.467,
        longitude: 107.579,
        city: 'Huế',
        createdAt: '2020-01-01T00:00:00.000Z',
        ...options.liveLocation,
      }
      return ok({
        items: [item],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
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
