import { expect, test } from '@playwright/test'
import { DISPOSABLE_ADMIN, expectAdminPage, mockAdminApi, pageResponse, seedAdminSession } from '../helpers/admin-fixtures'

test.beforeEach(async ({ page }) => {
  await seedAdminSession(page)
  await mockAdminApi(page)
})

test('admin landing exposes approved navigation and dashboard permissions', async ({ page }) => {
  await page.goto('/admin')
  await expectAdminPage(page, 'Bàn điều hành')
  const navigation = page.getByRole('navigation', { name: 'Điều hướng Admin Console' })
  await expect(navigation.getByRole('link', { name: 'Nội dung' })).toHaveAttribute('href', '/admin/content')
  await expect(navigation.getByRole('link', { name: 'Pilot cốt truyện' })).toHaveAttribute('href', '/admin/narrative-pilots')
  await expect(navigation.getByRole('link', { name: 'Thùng rác' })).toHaveAttribute('href', '/admin/trash')
  await expect(navigation.getByRole('link', { name: 'Thanh toán & CRM' })).toHaveAttribute('href', '/admin/billing')
  await expect(navigation.getByRole('link', { name: 'Nhật ký kiểm toán' })).toHaveAttribute('href', '/admin/audit')
})

test('admin search, sidebar and account menu work with keyboard and pointer', async ({ page }) => {
  await page.goto('/admin')
  const searchTrigger = page.getByRole('button', { name: 'Tìm trang quản trị' })
  await searchTrigger.click()
  const dialog = page.getByRole('dialog', { name: 'Điều hướng nhanh' })
  const search = dialog.getByRole('textbox', { name: 'Tìm trang quản trị' })
  await expect(search).toBeFocused()
  await search.fill('thanh toán')
  await expect(dialog.getByText('1 kết quả')).toBeVisible()
  await search.press('Enter')
  await expect(page).toHaveURL(/\/admin\/billing$/)
  await page.getByRole('button', { name: 'Tài khoản quản trị' }).click()
  const account = page.getByRole('menu', { name: 'Tài khoản quản trị' })
  await expect(account.getByRole('menuitem', { name: 'Hồ sơ cá nhân' })).toBeVisible()
  await expect(account.getByRole('menuitem', { name: 'Đăng xuất' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(account).toBeHidden()
  await expect(page.getByRole('button', { name: 'Tài khoản quản trị' })).toBeFocused()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Mở menu quản trị' }).click()
  await expect(page.getByRole('dialog', { name: 'Menu quản trị' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Menu quản trị' })).toBeHidden()
})

test('narrative pilot keeps details available without showing every editor at once', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/narrative-pilots', { waitUntil: 'domcontentloaded' })
  await expectAdminPage(page, 'Pilot cốt truyện')
  await page.getByRole('button', { name: 'Tạo bản nháp' }).click()
  await expect(page.locator('.narrative-metric')).toHaveCount(4)
  const metricColors = await page.locator('.narrative-metric').evaluateAll((cards) =>
    cards.map((card) => getComputedStyle(card).backgroundColor),
  )
  expect(new Set(metricColors).size).toBe(4)
  await page.getByRole('tab', { name: /Độ sẵn sàng/ }).click()
  await expect(page.getByText('Còn 1 điều kiện cần xử lý')).toBeVisible()
  const checks = page.getByRole('button', { name: /Xem thêm 2 điều kiện/ })
  await checks.click()
  await expect(page.getByText('Cấu hình hệ thống')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('narrative-readiness.png'), animations: 'disabled' })
  await page.getByRole('tab', { name: 'Sơ đồ' }).click()
  await expect(page.getByText('Chỉnh sửa các bước kịch bản')).toBeVisible()
  await expect(page.getByText('Bước bắt đầu', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Bắt đầu.*Xem thêm/ }).click()
  await expect(page.getByText('Mã bước')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('narrative-graph-open.png'), animations: 'disabled' })
  await page.getByRole('button', { name: /Bắt đầu.*Thu gọn/ }).click()
  await expect(page.getByText('Mã bước')).toBeHidden()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)
})

test('user management separates summary, demo controls and table on desktop and mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const users = [
    { id: 'user-one', email: 'lan@example.vn', displayName: 'Nguyễn Thị Lan', role: 'USER', tier: 'FREE', emailVerified: true, accountStatus: 'ACTIVE', level: 3, totalPoints: 120, createdAt: '2026-10-01T00:00:00Z' },
    { id: 'user-two', email: 'minh@example.vn', displayName: 'Trần Văn Minh', role: 'USER', tier: 'PREMIUM', emailVerified: false, accountStatus: 'ACTIVE', level: 4, totalPoints: 200, createdAt: '2026-10-02T00:00:00Z' },
  ]
  await page.route('**/api/admin/users?*', (route) => {
    const query = new URL(route.request().url()).searchParams
    const filtered = users.filter((user) =>
      (!query.has('tier') || user.tier === query.get('tier')) &&
      (!query.has('verified') || String(user.emailVerified) === query.get('verified')),
    )
    return route.fulfill({ json: pageResponse(filtered) })
  })
  await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })
  await expectAdminPage(page, 'Quản lý Người dùng')
  await expect(page).toHaveURL(/\/admin\/users\?size=10/)
  await expect(page.getByText('10 bản ghi / trang')).toBeVisible()
  const cards = page.locator('.users-stat-card')
  await expect(cards).toHaveCount(4)
  const backgrounds = await cards.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundColor),
  )
  expect(new Set(backgrounds).size).toBe(4)
  await expect(page.locator('.users-filter-panel')).toBeVisible()
  await expect(page.locator('.users-table-panel').getByText('Nguyễn Thị Lan')).toBeVisible()
  expect(await page.locator('.users-table-panel tbody td').first().evaluate((cell) => getComputedStyle(cell).textAlign)).toBe('center')
  const userActions = page.locator('.users-table-panel tbody tr').first().locator('.admin-table-actions > button')
  await expect(userActions).toHaveCount(3)
  const actionStyles = await userActions.evaluateAll((buttons) => buttons.map((button) => ({
    border: getComputedStyle(button).borderTopStyle,
    background: getComputedStyle(button).backgroundColor,
    left: button.getBoundingClientRect().left,
    right: button.getBoundingClientRect().right,
  })))
  expect(actionStyles.every((style) => style.border === 'solid' && style.background === 'rgb(255, 255, 255)')).toBe(true)
  expect(actionStyles[1].left - actionStyles[0].right).toBeGreaterThanOrEqual(7)
  expect(actionStyles[2].left - actionStyles[1].right).toBeGreaterThanOrEqual(7)
  const tableViewport = page.locator('.users-table-panel .overflow-x-auto')
  expect(await tableViewport.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
    await tableViewport.evaluate((element) => element.clientWidth),
  )
  await page.screenshot({ path: testInfo.outputPath('users-desktop.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)
  await page.screenshot({ path: testInfo.outputPath('users-mobile.png'), animations: 'disabled' })
})

test('organization detail uses distinct surfaces and readable member table', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const orgId = 'org-demo-1'
  await page.route('**/api/admin/organizations?*', (route) => route.fulfill({ json: pageResponse([
    { id: orgId, name: 'Bảo tàng Di sản', planType: 'STANDARD', memberCount: 1, status: 'ACTIVE' },
  ]) }))
  await page.route(`**/api/admin/organizations/${orgId}/analytics`, (route) => route.fulfill({ json: {
    success: true, data: { organizationId: orgId, name: 'Bảo tàng Di sản', orgType: 'MUSEUM', memberCount: 1, completionRatePct: 65, fullTourRatePct: 40, note: 'Đối tác thử nghiệm', lastCrmSyncedAt: null },
  } }))
  await page.route(`**/api/org/${orgId}/roster`, (route) => route.fulfill({ json: {
    success: true, data: [{ userId: 'member-one', displayName: 'Nguyễn Thị Lan', email: 'lan@example.vn', orgRole: 'teacher', level: 2, totalPoints: 120, questsCompleted: 3 }],
  } }))
  await page.goto(`/admin/organizations?orgId=${orgId}`, { waitUntil: 'domcontentloaded' })
  await expectAdminPage(page, 'Tổ chức và cơ quan liên kết')
  await expect(page.locator('.org-detail-card')).toBeVisible()
  const metricCards = page.locator('.org-metric-card')
  await expect(metricCards).toHaveCount(4)
  const backgrounds = await metricCards.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundColor),
  )
  expect(new Set(backgrounds).size).toBe(4)
  await expect(page.locator('.org-roster-panel').getByText('Nguyễn Thị Lan')).toBeVisible()
  expect(await page.locator('.org-roster-panel tbody td').first().evaluate((cell) => getComputedStyle(cell).textAlign)).toBe('center')
  await page.screenshot({ path: testInfo.outputPath('organizations-desktop.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)
  await page.screenshot({ path: testInfo.outputPath('organizations-mobile.png'), animations: 'disabled' })
})

test('dashboard gives KPI and priority states distinct surfaces on desktop and mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/admin')
  await expectAdminPage(page, 'Bàn điều hành')
  const cards = page.locator('[data-dashboard-card]')
  await expect(cards).toHaveCount(4)
  const backgrounds = await cards.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))
  expect(new Set(backgrounds).size).toBe(4)
  const queue = page.locator('[data-dashboard-queue]')
  await expect(queue).toHaveCount(4)
  const queueBackgrounds = await queue.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))
  expect(new Set(queueBackgrounds).size).toBeGreaterThanOrEqual(3)
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), animations: 'disabled' })
  await page.locator('[aria-labelledby="cross-segment-title"]').screenshot({ path: testInfo.outputPath('dashboard-segments.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.evaluate(() => window.scrollTo(0, 0))
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1281)
  await page.screenshot({ path: testInfo.outputPath('dashboard-laptop.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByRole('button', { name: 'Làm mới' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), animations: 'disabled' })
})

test('dashboard chart and activity log use readable Vietnamese labels with populated data', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.route('**/api/admin/billing/overview**', (route) => route.fulfill({ json: {
    success: true,
    data: {
      actualRevenueMonthVnd: 1845200000,
      monthOverMonthPct: 11.8,
      estimatedMrrVnd: 79000,
      estimatedArrVnd: 948000,
      revenueCoveragePct: 100,
      activePaidSubscriptions: 1,
      updatedAt: '2026-10-28T10:00:00Z',
      monthlyRevenue: [5, 6, 7, 8, 9, 10].map((month) => ({
        month: `2026-${String(month).padStart(2, '0')}`,
        b2cRevenueVnd: (month - 1) * 50000,
        b2bRevenueVnd: (month - 1) * 35000,
      })),
      planRevenue: [],
    },
  } }))
  await page.route('**/api/admin/audit**', (route) => route.fulfill({ json: pageResponse([
    { id: 'audit-created', actorId: 'admin', actorName: 'Platform Admin', entityType: 'QUEST', entityId: 'a1111111-1111', action: 'CREATED', reason: 'Đơn hàng quest demo seed', occurredAt: '2026-10-28T09:00:00Z' },
    { id: 'audit-updated', actorId: 'admin', actorName: 'Platform Admin', entityType: 'ORGANIZATION', entityId: 'b1111111-1111', action: 'UPDATED', reason: 'Nạp credit đối tác B2B demo', occurredAt: '2026-10-28T08:00:00Z' },
    { id: 'audit-reviewed', actorId: 'admin', actorName: 'Platform Admin', entityType: 'NARRATIVE_INVESTIGATION', entityId: 'c1111111-1111', action: 'REVIEWED', reason: 'Phê duyệt Pilot mới (seed)', occurredAt: '2026-10-28T07:00:00Z' },
  ]) }))
  await page.goto('/admin')
  await expect(page.getByText('Đã tạo · Nhiệm vụ')).toBeVisible()
  await expect(page.getByText('Đã cập nhật · Tổ chức')).toBeVisible()
  await expect(page.getByText('Đã duyệt · Kịch bản điều tra')).toBeVisible()
  await expect(page.getByText('Đơn hàng nhiệm vụ dữ liệu mẫu')).toBeVisible()
  await expect(page.getByText('Người thực hiện: Quản trị hệ thống').first()).toBeVisible()
  await expect(page.getByText('500 nghìn')).toBeVisible()
  await expect(page.getByText('100 nghìn')).toBeVisible()
  await page.locator('.dashboard-chart').screenshot({ path: testInfo.outputPath('revenue-chart.png'), animations: 'disabled' })
  await page.locator('.dashboard-log').screenshot({ path: testInfo.outputPath('activity-log.png'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Bảng số liệu' }).click()
  await expect(page.getByRole('columnheader', { name: 'Khách cá nhân' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Tổ chức' })).toBeVisible()
  await page.getByRole('button', { name: 'Tìm trang quản trị' }).click()
  await expect(page.getByRole('dialog', { name: 'Điều hướng nhanh' })).toBeVisible()
})

test('non-admin session cannot enter the admin console', async ({ page }) => {
  await seedAdminSession(page, 'USER')
  await mockAdminApi(page, 'USER')
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/explore$/)
})

test('billing route keeps payment channel filter and CSV export wired', async ({ page }) => {
  await page.goto('/admin/billing')
  await expectAdminPage(page, 'Thanh toán & CRM')
  await expect(page.getByRole('combobox', { name: 'Kênh giao dịch' })).toBeVisible()
  const exportResponse = page.waitForResponse((response) => response.url().includes('/api/admin/billing/payments/export.csv'))
  await page.getByRole('button', { name: 'Xuất đối soát CSV' }).click()
  await expect((await exportResponse).status()).toBe(200)
  await page.getByRole('combobox', { name: 'Kênh giao dịch' }).selectOption('B2C')
  await expect(page).toHaveURL(/channel=B2C/)
  await expect(page.getByText('HISTAR-E2E-PAYMENT')).toBeVisible()
  expect(DISPOSABLE_ADMIN.paymentId).toBe('histar-e2e-payment')
})

test('billing chart switches views and monthly ranges without changing its source data', async ({ page }) => {
  await page.goto('/admin/billing')
  await expectAdminPage(page, 'Thanh toán & CRM')
  const chart = page.getByRole('group', { name: 'Kiểu biểu đồ doanh thu' })
  const period = page.getByRole('group', { name: 'Khoảng thời gian doanh thu' })
  await expect(chart.getByRole('button', { name: 'Miền' })).toHaveAttribute('aria-pressed', 'true')
  for (const view of ['Cột', 'Kết hợp', 'Miền']) {
    await chart.getByRole('button', { name: view }).click()
    await expect(chart.getByRole('button', { name: view })).toHaveAttribute('aria-pressed', 'true')
  }
  for (const range of ['1 tháng', '3 tháng', '6 tháng', '1 năm', 'Khác']) {
    await period.getByRole('button', { name: range }).click()
    await expect(period.getByRole('button', { name: range })).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(page.getByText('Allocation')).toHaveCount(0)
  const info = page.getByRole('button', { name: 'Thông tin về phân bổ doanh thu' })
  await info.click()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test('CRM shows the pilot consultation brief and contact details to admin', async ({ page }) => {
  await page.route('**/api/admin/b2b2c-inquiries**', async (route) => route.fulfill({
    json: {
      success: true,
      data: {
        items: [{
          id: '11111111-1111-1111-1111-111111111111',
          siteName: 'Khu di tích Nhà tù Hỏa Lò',
          organizationName: 'Ban quản lý di tích Hà Nội',
          contactName: 'Nguyễn Thị Lan',
          contactEmail: 'lan@example.vn',
          contactPhone: '0901234567',
          contactRole: 'Phòng truyền thông',
          siteLocation: 'Hà Nội',
          availableMaterials: 'Ảnh tư liệu và bản đồ cũ',
          targetStart: 'Quý III/2027',
          packageType: 'UNDECIDED',
          message: 'Tour tự hướng dẫn',
          status: 'NEW',
          createdAt: '2026-10-28T00:00:00Z',
        }],
        page: 0, size: 100, totalItems: 1, totalPages: 1,
      },
    },
  }))
  await page.goto('/admin/billing')
  await expect(page.getByText('Khu di tích Nhà tù Hỏa Lò').first()).toBeVisible()
  await expect(page.getByText('Ban quản lý di tích Hà Nội').first()).toBeVisible()
  await expect(page.getByText('Ảnh tư liệu và bản đồ cũ')).toHaveCount(0)
  await page.getByRole('button', { name: 'Xem thêm' }).first().click()
  await expect(page.getByText('Ảnh tư liệu và bản đồ cũ').first()).toBeVisible()
  await expect(page.getByText('Quý III/2027').first()).toBeVisible()
  await expect(page.getByText('0901234567').first()).toBeVisible()
})

test('consultation deep link reaches CRM and a newly submitted lead appears after refresh', async ({ page }) => {
  let visible = false
  await page.route('**/api/admin/b2b2c-inquiries**', async (route) => route.fulfill({
    json: pageResponse(visible ? [{
      id: '11111111-1111-1111-1111-111111111111',
      siteName: 'Di tích mới',
      organizationName: 'Ban quản lý',
      contactName: 'Người liên hệ',
      contactEmail: 'lead@example.vn',
      packageType: 'UNDECIDED',
      status: 'NEW',
      createdAt: '2026-10-28T00:00:00Z',
    }] : []),
  }))
  await page.goto('/admin/billing?tab=pipeline')
  const section = page.getByRole('region', { name: 'Yêu cầu tư vấn số hóa di sản' })
  await expect(section).toBeVisible()
  await expect(section.getByText('Chưa có yêu cầu')).toBeVisible()
  visible = true
  await section.getByRole('button', { name: 'Làm mới' }).click()
  await expect(section.getByText('Di tích mới')).toBeVisible()
  await section.getByRole('button', { name: 'Xem thêm' }).first().click()
  await expect(section.getByText('11111111-1111-1111-1111-111111111111')).toBeVisible()
  await section.getByRole('button', { name: 'Bảng ma trận' }).click()
  await section.getByRole('textbox', { name: 'Tìm yêu cầu tư vấn' }).fill('lead@example.vn')
  await section.getByRole('button', { name: 'Tìm' }).click()
  await expect(page).toHaveURL(/inquiryQuery=lead%40example.vn/)
  await expect(section.getByText('Di tích mới')).toBeVisible()
})

test('CRM saves edited notes before collapsing a lead or changing its view', async ({ page }) => {
  const lead = {
    id: '11111111-1111-1111-1111-111111111111', siteName: 'Di tích thử nghiệm',
    contactName: 'Người liên hệ', contactEmail: 'lead@example.vn', packageType: 'MUSEUM',
    status: 'NEW', createdAt: '2026-10-28T00:00:00Z', adminNotes: '',
  }
  const patches: Array<{ status: string; adminNotes: string }> = []
  await page.route('**/api/admin/b2b2c-inquiries/**', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as { status: string; adminNotes: string }
      patches.push(body)
      lead.adminNotes = body.adminNotes
      await route.fulfill({ json: { success: true, data: lead } })
    } else await route.continue()
  })
  await page.route('**/api/admin/b2b2c-inquiries**', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ json: pageResponse([lead]) })
    else await route.fallback()
  })
  await page.goto('/admin/billing?tab=pipeline')
  const section = page.getByRole('region', { name: 'Yêu cầu tư vấn số hóa di sản' })
  await section.getByRole('button', { name: 'Xem thêm' }).click()
  await section.getByRole('textbox', { name: 'Ghi chú quản trị' }).fill('Đã kiểm tra tư liệu')
  await section.getByRole('button', { name: 'Thu gọn' }).click()
  await expect.poll(() => patches.length).toBeGreaterThan(0)
  expect(patches.at(-1)).toMatchObject({ status: 'NEW', adminNotes: 'Đã kiểm tra tư liệu' })
  await section.getByRole('button', { name: 'Bảng ma trận' }).click()
  await expect(section.getByText('Di tích thử nghiệm')).toBeVisible()
  await section.getByRole('button', { name: 'Xem thêm' }).click()
  await expect(section.getByRole('textbox', { name: 'Ghi chú quản trị' })).toHaveValue('Đã kiểm tra tư liệu')
  await section.getByRole('textbox', { name: 'Ghi chú quản trị' }).fill('Đã hẹn khảo sát thực địa')
  await section.getByRole('button', { name: 'Bảng giai đoạn' }).click()
  await expect.poll(() => patches.length).toBeGreaterThan(1)
  expect(patches.at(-1)).toMatchObject({ status: 'NEW', adminNotes: 'Đã hẹn khảo sát thực địa' })
})

test('billing keeps its page within narrow mobile viewports', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 780 })
    await page.goto('/admin/billing')
    await expectAdminPage(page, 'Thanh toán & CRM')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)
    await expect(page.locator('.admin-billing-ledger')).toBeVisible()
  }
})

test('all admin pages use the landing palette and remain readable at desktop and mobile widths', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const routes = [
    ['dashboard', '/admin'],
    ['content', '/admin/content'],
    ['narrative', '/admin/narrative-pilots'],
    ['trash', '/admin/trash'],
    ['users', '/admin/users'],
    ['organizations', '/admin/organizations'],
    ['billing', '/admin/billing'],
    ['analytics', '/admin/analytics'],
    ['audit', '/admin/audit'],
  ] as const

  for (const [viewport, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['mobile-small', 320, 720]] as const) {
    await page.setViewportSize({ width, height })
    for (const [name, route] of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const shell = page.locator('.admin-console')
      await expect(shell).toBeVisible()
      if (viewport === 'mobile' && name === 'dashboard') {
        await page.getByRole('button', { name: 'Tìm trang quản trị' }).click()
        await expect(page.getByRole('dialog', { name: 'Điều hướng nhanh' })).toBeVisible()
        await page.keyboard.press('Escape')
      }
      if (viewport === 'desktop' && name === 'dashboard') {
        await page.getByRole('button', { name: 'Thao tác nhanh' }).click()
        await expect(page.getByRole('dialog', { name: 'Thao tác nhanh' })).toBeVisible()
        await page.screenshot({ path: testInfo.outputPath('desktop-quick-actions.png'), animations: 'disabled' })
        await page.keyboard.press('Escape')
      }
      if (name === 'content' && viewport !== 'desktop') {
        const table = page.getByRole('region', { name: 'Bảng nội dung, có thể cuộn ngang để xem thêm cột' })
        await expect(table).toBeVisible()
        expect(await table.evaluate((element) => element.scrollWidth), `${viewport} table scroll width`).toBeGreaterThan(await table.evaluate((element) => element.clientWidth))
      }
      await page.evaluate(() => document.fonts.ready)
      const styles = await shell.evaluate((element) => {
        const style = getComputedStyle(element)
        return { background: style.backgroundColor, color: style.color, font: style.fontFamily }
      })
      expect(styles.background, `${route} ${viewport}`).toBe('rgb(242, 247, 255)')
      expect(styles.color, `${route} ${viewport}`).toBe('rgb(15, 27, 51)')
      expect(styles.font, `${route} ${viewport}`).toContain('Be Vietnam Pro')
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} ${viewport} horizontal overflow`).toBeLessThanOrEqual(width + 1)
      await page.screenshot({ path: testInfo.outputPath(`${viewport}-${name}.png`), animations: 'disabled' })
    }
  }
})
