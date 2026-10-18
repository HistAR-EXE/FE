import { test, expect, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

const entry = (rank: number | null, id: string, xp: number, currentUser = false) => ({
  rank, userId: id, displayName: currentUser ? 'Huy Nguyễn' : `Nhà thám hiểm ${id}`, avatarUrl: null,
  totalPoints: xp, currentUser, level: 2, badgeCount: 1,
})
const board = () => ({ scope: 'all', city: null, viewerRankLocked: false,
  entries: [entry(1, 'a', 600), entry(2, 'b', 500), entry(3, 'c', 400)],
  viewer: entry(12, 'me', 120, true), nearby: [entry(11, 'n', 145), entry(12, 'me', 120, true)],
  totalParticipants: 25, updatedAt: '2026-10-17T00:00:00Z', displayLimit: 10, cutoffXp: null as number | null, omittedTiedAtCutoff: 0,
})
const passport = () => ({ userId: 'me', displayName: 'Huy Nguyễn', totalPoints: 120, level: 2, levelName: 'Lữ hành di sản', badgeCount: 1,
  heritageBadges: [{ id: 'badge_compass_pioneer', earnedAt: '2026-10-16T00:00:00Z' }], generatedAt: '2026-10-17T00:00:00Z' })
const community = () => ({ scope: 'all', explorers: 123, completedChallenges: 456, discoveries: 234, badges: 321, updatedAt: '2026-10-17T00:00:00Z' })
const stories = () => ({ userId: 'me', updatedAt: '2026-10-17T00:00:00Z',
  timeline: [
    { id: 'badge:first', title: 'La Bàn Khởi Nguyên', description: 'Huy hiệu đã được ghi nhận.', occurredAt: '2026-10-16T04:00:00Z', href: '/profile', icon: 'military_tech' },
    { id: 'xp:100', title: 'Chạm mốc 100 XP', description: 'Thành tích tích lũy toàn hệ thống.', occurredAt: null, href: '/profile', icon: 'auto_awesome' },
    ...Array.from({ length: 5 }, (_, i) => ({ id: `discovery:${i}`, title: `Dấu ấn ${i + 1}`, description: 'Hoạt động được xác nhận.', occurredAt: null, href: '/explore', icon: 'explore' })),
  ],
  paths: [
    { id: 'depths', title: 'Chinh phục lòng đất', description: 'Hoàn thành bốn thử thách tầng ngầm.', completed: 3, total: 4, percent: 75, href: '/explore?honorsPath=depths&target=layer3', actionLabel: 'Tiếp tục tầng còn lại', complete: false },
    { id: 'ciphers', title: 'Giải mã di sản', description: 'Hoàn thành ba mật thư.', completed: 3, total: 3, percent: 100, href: '/explore?honorsPath=ciphers', actionLabel: 'Nhìn lại hành trình', complete: true },
  ],
  spotlights: ['Người giải mã di sản', 'Người kết nối dấu tích', 'Người chinh phục cột mốc', 'Người sưu tầm dấu ấn'].map((title, i) => ({ id: `category-${i}`, title, description: 'Chỉ ghi nhận hoạt động đã xác nhận từ hệ thống.', unit: 'dấu ấn', totalAchievers: 2, viewerCount: 2, viewerRank: 1,
    leaders: ['a', 'me'].map(userId => ({ userId, displayName: userId === 'me' ? 'Huy Nguyễn' : 'Nguyễn Hoàng Phương Anh', avatarUrl: null, count: 2, currentUser: userId === 'me' })) })),
})
async function setup(page: Page) {
  const state = { board: board(), passport: passport(), community: community(), passportFailed: false, communityFailed: false, stories: stories(), storiesFailed: false, failed: false, personalFailed: false, userId: 'me',
    mailStatus: { available: true, verified: true, email: 'me@example.test' as string | null, cooldownSeconds: 0, remainingToday: 3 }, mailFailed: false, mailUploads: [] as Buffer[] }
  const requests: string[] = []
  await page.addInitScript(() => {
    for (const [key, value] of Object.entries({ timelens_token: 'honors-ui', timelens_user_id: 'me',
      timelens_display_name: 'Huy Nguyễn', timelens_role: 'USER', timelens_tier: 'FREE', timelens_email_verified: '1',
      timelens_mode: 'online', histar_consent_v1: JSON.stringify({ analytics: false, camera: false, gps: false }) })) localStorage.setItem(key, value)
    localStorage.setItem('timelens_points', '999999')
  })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url()); requests.push(`${route.request().method()} ${url.pathname}${url.search}`)
    const profile = { id: state.userId, email: 'me@example.test', displayName: 'Huy Nguyễn', role: 'USER', tier: 'FREE', emailVerified: true,
      avatarUrl: null, orgId: null, orgSubscription: 'NONE', totalPoints: 120, level: 2, levelName: 'Lữ hành di sản',
      pointsToNextLevel: 180, levelProgressPercent: 10, activeVisitSites: [] }
    if (url.pathname === '/api/leaderboard') {
      return route.fulfill({ status: state.failed ? 503 : 200, json: state.failed ? { success: false, message: 'Unavailable' } : { success: true, data: state.board } })
    }
    if (url.pathname === '/api/leaderboard/stories') {
      return route.fulfill({ status: state.storiesFailed ? 503 : 200, json: { success: !state.storiesFailed, data: state.stories } })
    }
    if (url.pathname === '/api/leaderboard/passport') return route.fulfill({ status: state.passportFailed ? 503 : 200, json: { success: !state.passportFailed, data: state.passport } })
    if (url.pathname === '/api/leaderboard/passport/email/status') return route.fulfill({ json: { success: true, data: state.mailStatus } })
    if (url.pathname === '/api/leaderboard/passport/email') {
      state.mailUploads.push(route.request().postDataBuffer()!)
      return route.fulfill({ status: state.mailFailed ? 502 : 200, json: state.mailFailed
        ? { success: false, code: 'PASSPORT_MAIL_FAILED', message: 'Dịch vụ email chưa tiếp nhận được thư.' }
        : { success: true, data: { status: 'ACCEPTED', cooldownSeconds: 60, remainingToday: 2 } } })
    }
    if (url.pathname === '/api/leaderboard/community') return route.fulfill({ status: state.communityFailed ? 503 : 200, json: { success: !state.communityFailed, data: state.community } })
    if (url.pathname === '/api/me/explore/summary') {
      return route.fulfill({ status: state.personalFailed ? 503 : 200, json: { success: true, data: { profile,
        archiveXp: 15, discovery: { discovered: 1, total: 61, keys: ['depth_quiz:surface'], version: 1 },
        badges: [{ id: 'badge_compass_pioneer', earned: true, earnedAt: '2026-10-17T00:00:00Z', progressPercent: 100, progressText: 'Đã đạt' }] } } })
    }
    return route.fulfill({ json: { success: true, data: url.pathname === '/api/profile/me' ? profile : [] } })
  })
  return { state, requests }
}

test('Free explorer sees lifetime honors and own position outside top with server XP', async ({ page }) => {
  const { requests } = await setup(page)
  await page.goto('/leaderboard')
  await expect(page.getByRole('heading', { name: 'Một hành trình đáng tự hào.' })).toBeVisible()
  await expect(page.getByTestId('honors-viewer')).toContainText('#12')
  await expect(page.getByTestId('honors-viewer')).toContainText('120')
  await expect(page.getByTestId('honors-viewer')).not.toContainText('999999')
  await expect(page.getByRole('button', { name: /tuần|tháng|premium/i })).toHaveCount(0)
  expect(requests.filter(r => r.startsWith('POST') && r.includes('leaderboard'))).toHaveLength(0)
  expect(requests.some(r => r === 'GET /api/me/explore')).toBe(false)
  await expect(page.getByRole('heading', { name: 'Dấu ấn trên hành trình của bạn' })).toBeVisible()
  await expect(page.getByText('Bạn đã chinh phục trọn bộ huy hiệu di sản Củ Chi.', { exact: false })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/leaderboard-desktop.png', fullPage: true })
})

test('ranking failure is retryable and never shown as an empty successful board', async ({ page }) => {
  const { state } = await setup(page); state.failed = true
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-error')).toBeVisible()
  await expect(page.getByTestId('honors-empty')).toHaveCount(0)
  state.failed = false
  await page.getByRole('button', { name: 'Thử lại bảng vinh danh' }).click()
  await expect(page.getByTestId('honors-viewer')).toContainText('#12')
  await expect(page.getByTestId('honors-error')).toHaveCount(0)
})

test('personal details failure does not hide valid community ranks', async ({ page }) => {
  const { state } = await setup(page); state.personalFailed = true
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-viewer')).toContainText('120')
  await expect(page.getByTestId('honors-personal-error')).toBeVisible()
  await expect(page.getByText('Nhà thám hiểm a', { exact: true })).toBeVisible()
})

test('no participants and no XP display encouragement without a fake rank', async ({ page }) => {
  const { state } = await setup(page)
  state.board = { ...board(), entries: [], nearby: [], viewer: entry(null, 'me', 0, true), totalParticipants: 0 }
  state.personalFailed = true
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-empty')).toBeVisible()
  await expect(page.getByTestId('honors-viewer')).toContainText('Chưa xếp hạng')
  await expect(page.getByTestId('honors-viewer')).not.toContainText('#0')
})

test('equal XP has shared ranks instead of declaring an arbitrary winner', async ({ page }) => {
  const { state } = await setup(page)
  state.board.entries = [entry(1, 'a', 600), entry(1, 'b', 600), entry(3, 'c', 400)]
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-podium').getByText('Đồng hạng 1', { exact: true })).toHaveCount(2)
})

test('rules dialog supports Escape and returns keyboard focus', async ({ page }) => {
  await setup(page); await page.goto('/leaderboard')
  const button = page.getByRole('button', { name: 'Nguyên tắc vinh danh', exact: true })
  await button.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('cùng XP')
  const bounds = await page.getByRole('dialog').boundingBox()
  const viewport = page.viewportSize()!
  expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThan(3)
  expect(Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2)).toBeLessThan(3)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(button).toBeFocused()
})

test('scrolling personal card cannot cover the badges section', async ({ page }) => {
  await setup(page); await page.goto('/leaderboard')
  const badges = page.getByTestId('honors-badges')
  await expect(badges).toBeVisible()
  await badges.scrollIntoViewIfNeeded()
  const card = await page.getByTestId('honors-viewer').boundingBox()
  const badgeBox = await badges.boundingBox()
  expect(card!.y + card!.height).toBeLessThanOrEqual(badgeBox!.y)
})

test('larger type and reduced motion remain accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await setup(page)
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-viewer')).toBeVisible()
  const typography = await page.getByTestId('honors-timeline').getByRole('heading', { name: 'Hành trình làm nên bạn' }).evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize))
  expect(typography).toBeGreaterThanOrEqual(13)
  expect(await page.getByRole('img', { name: 'Chrono đồng hành cùng nhà thám hiểm' }).evaluate(el => getComputedStyle(el).animationName)).toBe('none')
})

test('mobile layout has readable personal rank and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page)
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-viewer')).toContainText('#12')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/leaderboard-mobile.png', fullPage: true })
})

test('many sample explorers keep mobile names, badges and rules readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { state } = await setup(page)
  state.board.entries = Array.from({ length: 18 }, (_, i) => ({ ...entry(i + 1, `sample-${i}`, 3000 - i * 100),
    displayName: 'Nguyễn Hoàng Phương Anh · Mẫu UI', badgeCount: i % 10 }))
  await page.goto('/leaderboard')
  await expect(page.getByText('Đang xem dữ liệu mẫu trên local')).toBeVisible()
  await expect(page.getByText('Mẫu UI', { exact: true })).toHaveCount(10)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/leaderboard-many-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Nguyên tắc vinh danh', exact: true }).click()
  const bounds = await page.getByRole('dialog').boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844)
  await expect(page.getByRole('button', { name: /^Tiếp bước hành trình/ })).toBeInViewport()
  await page.screenshot({ path: 'test-results/leaderboard-rules-mobile.png' })
})

test('main gallery has ten people while preserving outside viewer and cutoff tie explanation', async ({ page }) => {
  const { state } = await setup(page)
  state.board.entries = Array.from({ length: 18 }, (_, i) => entry(i < 7 ? i + 1 : 8, `top-${i}`, i < 7 ? 2000 - i * 100 : 1000))
  state.board.cutoffXp = 1000; state.board.omittedTiedAtCutoff = 8
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-featured').getByRole('row')).toHaveCount(8)
  await expect(page.getByTestId('honors-cutoff-note')).toContainText('8')
  await expect(page.getByTestId('honors-viewer')).toContainText('#12')
})

test('community metrics are real scoped data with explicit definitions and retry', async ({ page }) => {
  const { state } = await setup(page); state.communityFailed = true
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-viewer')).toContainText('#12')
  await expect(page.getByTestId('honors-community-error')).toBeVisible()
  state.communityFailed = false
  await page.getByRole('button', { name: 'Tải lại dấu ấn cộng đồng' }).click()
  await expect(page.getByTestId('honors-community')).toContainText('456')
  await expect(page.getByTestId('honors-community')).toContainText('Củ Chi')
})

test('passport prepares fresh private facts, honors visibility choices and downloads a PNG', async ({ page }) => {
  const { state } = await setup(page)
  await page.goto('/leaderboard')
  await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Hiển thị tên của tôi').uncheck()
  state.passport.totalPoints = 250
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByRole('img', { name: 'Ảnh hộ chiếu đã chuẩn bị' })).toBeVisible()
  await expect(dialog.getByTestId('passport-export-facts')).toContainText('250')
  await expect(dialog.getByTestId('passport-export-facts')).not.toContainText('999999')
  const downloadEvent = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Tải ảnh về máy', exact: true }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toMatch(/timelens.*\.png$/)
  await download.saveAs('test-results/honors-passport-export.png')
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0)
})

test('passport load failure and another owner cannot produce a souvenir', async ({ page }) => {
  const { state } = await setup(page); state.passport.userId = 'foreign'
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-passport-error')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn', exact: true })).toHaveCount(0)
  await expect(page.getByTestId('honors-viewer')).toContainText('#12')
})

test('passport email sends the same complete PNG as download and enforces cooldown', async ({ page }) => {
  const { state } = await setup(page); await page.goto('/leaderboard')
  await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await expect(dialog.getByRole('button', { name: 'Nhận qua email', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByAltText('Ảnh hộ chiếu đã chuẩn bị')).toBeVisible()
  const bytes = await dialog.getByAltText('Ảnh hộ chiếu đã chuẩn bị').evaluate(async (img: HTMLImageElement) => Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer())))
  expect(Buffer.from(bytes).readUInt32BE(16)).toBe(1200)
  expect(Buffer.from(bytes).readUInt32BE(20)).toBe(1500)
  await expect(dialog.getByTestId('passport-email-recipient')).toContainText('me@example.test')
  await dialog.getByRole('button', { name: 'Nhận qua email', exact: true }).click()
  await expect(dialog.getByTestId('passport-email-feedback')).toContainText('tiếp nhận')
  expect(state.mailUploads).toHaveLength(1)
  expect(state.mailUploads[0].includes(Buffer.from(bytes))).toBe(true)
  expect(state.mailUploads[0].toString('latin1')).not.toContain('name="to"')
  await expect(dialog.getByRole('button', { name: /Gửi lại sau/ })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Tải ảnh về máy' })).toBeEnabled()
  await dialog.screenshot({ path: 'test-results/honors-passport-email-desktop.png' })
})

test('unverified and unavailable email never claim success and keep download usable', async ({ page }) => {
  const { state } = await setup(page)
  state.mailStatus.verified = false; state.mailStatus.email = null
  await page.goto('/leaderboard'); await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByRole('button', { name: 'Tải ảnh về máy' })).toBeEnabled()
  await expect(dialog.getByRole('button', { name: 'Nhận qua email', exact: true })).toBeDisabled()
  await expect(dialog.getByTestId('passport-email-recipient')).toContainText('xác minh')
  expect(state.mailUploads).toHaveLength(0)
})

test('provider email failure is honest and does not block downloading the passport', async ({ page }) => {
  const { state } = await setup(page); state.mailFailed = true
  await page.goto('/leaderboard'); await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByRole('button', { name: 'Nhận qua email', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Nhận qua email', exact: true }).click()
  await expect(dialog.getByTestId('passport-email-feedback')).toContainText('chưa')
  await expect(dialog.getByRole('button', { name: 'Tải ảnh về máy' })).toBeEnabled()
})

test('disabled mail and exhausted daily limits leave the download action available', async ({ page }) => {
  const { state } = await setup(page); state.mailStatus.available = false
  await page.goto('/leaderboard'); await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  let dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await expect(dialog.getByTestId('passport-email-recipient')).toContainText('chưa sẵn sàng')
  await expect(dialog.getByRole('button', { name: 'Nhận qua email', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  state.mailStatus.available = true; state.mailStatus.remainingToday = 0
  await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByTestId('passport-email-recipient')).toContainText('0/3')
  await expect(dialog.getByRole('button', { name: 'Nhận qua email', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Tải ảnh về máy' })).toBeEnabled()
  expect(state.mailUploads).toHaveLength(0)
})

test('pending email prevents duplicate clicks while keeping PNG download available', async ({ page }) => {
  await setup(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve }); let uploads = 0
  await page.route('**/api/leaderboard/passport/email', async route => {
    uploads++; await gate
    await route.fulfill({ json: { success: true, data: { status: 'ACCEPTED', cooldownSeconds: 60, remainingToday: 2 } } })
  })
  await page.goto('/leaderboard'); await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByRole('button', { name: 'Nhận qua email', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Nhận qua email', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Đang gửi email…', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Tải ảnh về máy' })).toBeEnabled()
  expect(uploads).toBe(1)
  release(); await expect(dialog.getByTestId('passport-email-feedback')).toContainText('tiếp nhận')
})

test('anonymous passport hides identifying image text and sends no invented email', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => {
    const text: string[] = []
    ;(window as Window & { passportDrawnText?: string[] }).passportDrawnText = text
    const original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof original>) { text.push(args[0]); return original.apply(this, args) }
  })
  await page.goto('/leaderboard'); await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await dialog.getByLabel('Hiển thị tên của tôi').uncheck()
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByAltText('Ảnh hộ chiếu đã chuẩn bị')).toBeVisible()
  const drawn = await page.evaluate(() => (window as Window & { passportDrawnText?: string[] }).passportDrawnText!.join('\n'))
  expect(drawn).not.toContain('me@example.test'); expect(drawn).not.toContain('me@timelens.vn')
  expect(drawn).not.toContain('HUY NGUYỄN'); expect(drawn).toContain('THÁM HIỂM TIMELENS')
})

test('desktop composition pairs ranking and passport without a dangling sticky column', async ({ page }) => {
  const { state } = await setup(page)
  state.board.entries = Array.from({ length: 10 }, (_, i) => entry(i + 1, `honored-${i}`, 2000 - i * 100))
  await page.goto('/leaderboard')
  const featured = await page.getByTestId('honors-featured').boundingBox()
  const identity = await page.getByTestId('honors-identity-column').boundingBox()
  expect(Math.abs(featured!.y - identity!.y)).toBeLessThan(5)
  await expect(page.getByTestId('honors-passport')).toBeVisible()
  expect(await page.getByTestId('honors-identity-column').evaluate(el => getComputedStyle(el).position)).not.toBe('sticky')
  await page.screenshot({ path: 'test-results/honors-complete-desktop.png', fullPage: true })
})

test('a response belonging to another account is rejected', async ({ page }) => {
  const { state } = await setup(page)
  state.board.viewer = entry(1, 'someone-else', 99000, true)
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-error')).toBeVisible()
  await expect(page.getByTestId('honors-viewer')).toHaveCount(0)
})

test('personal timeline preserves real dates and distinguishes unknown historical dates', async ({ page }) => {
  await setup(page); await page.goto('/leaderboard')
  const timeline = page.getByTestId('honors-timeline')
  await expect(timeline).toContainText('La Bàn Khởi Nguyên')
  await expect(timeline.locator('time').first()).toHaveAttribute('datetime', '2026-10-16T04:00:00Z')
  await expect(timeline).toContainText('Chưa có ngày ghi nhận')
  await page.getByRole('button', { name: /Xem thêm.*dấu ấn/ }).click()
  await expect(timeline).toContainText('Dấu ấn 5')
})

test('next step selects nearest unfinished path and keeps its exact destination', async ({ page }) => {
  await setup(page); await page.goto('/leaderboard')
  const next = page.getByTestId('honors-next-step')
  await expect(next).toContainText('Chinh phục lòng đất')
  await expect(next).toContainText('3/4')
  await expect(next.getByRole('link', { name: /Tiếp tục tầng còn lại/ })).toHaveAttribute('href', '/explore?honorsPath=depths&target=layer3')
  await expect(page.getByTestId('honors-spotlights')).toContainText('Muôn cách để tỏa sáng')
  await expect(page.getByTestId('honors-spotlights').getByText('Cùng dẫn đầu', { exact: true })).toHaveCount(4)
})

test('optional stories error cannot hide ranks or invent an empty achievement history', async ({ page }) => {
  const { state } = await setup(page); state.storiesFailed = true
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-viewer')).toContainText('#12')
  await expect(page.getByTestId('honors-stories-error')).toBeVisible()
  await expect(page.getByTestId('honors-timeline')).toHaveCount(0)
  state.storiesFailed = false
  await page.getByRole('button', { name: 'Tải lại câu chuyện hành trình' }).click()
  await expect(page.getByTestId('honors-timeline')).toBeVisible()
})

test('completed paths celebrate completion without promising more rewards', async ({ page }) => {
  const { state } = await setup(page)
  state.stories.paths = state.stories.paths.map(path => ({ ...path, completed: path.total, percent: 100, complete: true }))
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-next-step')).toContainText('Trọn vẹn một hành trình')
  await expect(page.getByTestId('honors-next-step')).not.toContainText('còn lại')
})

test('stories reject a different owner and unsafe navigation links', async ({ page }) => {
  const { state } = await setup(page); state.stories.userId = 'foreign'
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-stories-error')).toBeVisible()
  await expect(page.getByTestId('honors-timeline')).toHaveCount(0)
  state.stories.userId = 'me'; state.stories.paths[0].href = 'https://untrusted.example/path'
  await page.getByRole('button', { name: 'Tải lại câu chuyện hành trình' }).click()
  await expect(page.getByTestId('honors-stories-error')).toBeVisible()
})

test('story cards remain readable on mobile with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' })
  await setup(page); await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-timeline')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/honors-stories-mobile.png', fullPage: true })
})

test('live PostgreSQL stories contract is accepted by the UI', async ({ page }) => {
  const contract = new URL('../../../BE/target/honors-stories-contract.json', import.meta.url)
  test.skip(!existsSync(contract), 'Optional local integration: run BE/scripts/test-honors-live.cjs first')
  const { state } = await setup(page)
  state.stories = { ...JSON.parse(readFileSync(contract, 'utf8')), userId: 'me' }
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-timeline')).toContainText('100 XP')
  await expect(page.getByTestId('honors-stories-error')).toHaveCount(0)
  await expect(page.getByTestId('honors-spotlights')).toContainText('Người giải mã di sản')
  const layout = await page.getByTestId('honors-spotlights').evaluate(element => {
    const main = element.closest('main')!
    const bounds = main.getBoundingClientRect()
    return { main: { x: bounds.x, right: bounds.right, width: bounds.width, scrollLeft: main.scrollLeft },
      cards: [...element.querySelectorAll('article')].map(card => { const rect = card.getBoundingClientRect(); return { left: rect.left, right: rect.right } }) }
  })
  expect(layout.cards.every(card => card.left >= layout.main.x && card.right <= layout.main.right)).toBe(true)
  const nameWidth = await page.getByTestId('honors-spotlights').locator('li b').first().evaluate(element => element.getBoundingClientRect().width)
  expect(nameWidth).toBeGreaterThanOrEqual(100)
  await page.getByTestId('honors-spotlights').screenshot({ path: 'test-results/honors-live-spotlights.png' })
})

test('an older backend payload is not silently shown as an empty board', async ({ page }) => {
  await setup(page)
  await page.route('**/api/leaderboard*', route => route.fulfill({ json: { success: true, data: { entries: [] } } }))
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-error')).toBeVisible()
  await expect(page.getByTestId('honors-empty')).toHaveCount(0)
})

test('mobile passport keeps two email and download actions visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  await page.goto('/leaderboard')
  await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByAltText('Ảnh hộ chiếu đã chuẩn bị')).toBeVisible()
  const action = dialog.getByRole('button', { name: 'Nhận qua email', exact: true })
  const bounds = await action.boundingBox()
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844)
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await action.click()
  await expect(dialog.getByTestId('passport-email-feedback')).toContainText('tiếp nhận')
  await expect(dialog.locator('footer button')).toHaveCount(2)
  await page.screenshot({ path: 'test-results/honors-passport-mobile.png' })
})

test('changing privacy settings invalidates a prepared passport', async ({ page }) => {
  await setup(page); await page.goto('/leaderboard')
  await page.getByRole('button', { name: 'Thiết kế Hộ chiếu của bạn' }).click()
  const dialog = page.getByRole('dialog', { name: 'Hộ chiếu nhà thám hiểm' })
  await dialog.getByRole('button', { name: 'Tạo ảnh từ thành tích mới nhất' }).click()
  await expect(dialog.getByRole('button', { name: 'Tải ảnh về máy' })).toBeEnabled()
  await dialog.getByLabel('Hiển thị tổng XP', { exact: true }).uncheck()
  await expect(dialog.getByRole('button', { name: 'Tải ảnh về máy' })).toBeDisabled()
  await expect(dialog.getByAltText('Ảnh hộ chiếu đã chuẩn bị')).toHaveCount(0)
})

test('a slow optional personal endpoint does not block community ranks', async ({ page }) => {
  await setup(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/me/explore/summary', async route => { await gate; await route.fulfill({ status: 503, json: { success: false } }) })
  await page.goto('/leaderboard')
  await expect(page.getByTestId('honors-viewer')).toContainText('#12')
  await expect(page.getByText('Đang tải chi tiết dấu ấn cá nhân…')).toBeVisible()
  release()
  await expect(page.getByTestId('honors-personal-error')).toBeVisible()
})

test('late responses cannot restore the previous accounts rank', async ({ page }) => {
  const { state } = await setup(page)
  await page.goto('/leaderboard'); await expect(page.getByTestId('honors-viewer')).toContainText('120')
  let release!: () => void, signal!: () => void, completed!: () => void
  let holdNext = true
  const gate = new Promise<void>(resolve => { release = resolve })
  const started = new Promise<void>(resolve => { signal = resolve })
  const finished = new Promise<void>(resolve => { completed = resolve })
  await page.route('**/api/leaderboard*', async route => {
    const data = structuredClone(state.board)
    if (holdNext) { holdNext = false; signal(); await gate; await route.fulfill({ json: { success: true, data } }); completed() }
    else await route.fulfill({ json: { success: true, data } })
  })
  await page.getByRole('button', { name: 'Làm mới bảng vinh danh' }).click(); await started
  state.userId = 'second-account'; state.board.viewer = entry(8, 'second-account', 350, true)
  await page.evaluate(() => {
    localStorage.setItem('timelens_user_id', 'second-account')
    window.dispatchEvent(new CustomEvent('histar:session-refreshed'))
  })
  await expect(page.getByTestId('honors-viewer')).toContainText('350')
  release(); await finished
  await expect(page.getByTestId('honors-viewer')).toContainText('350')
  await expect(page.getByTestId('honors-viewer')).not.toContainText('#12')
})
