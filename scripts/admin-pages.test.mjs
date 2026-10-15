import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('dashboard separates operational and commercial data with accessible revenue history', async () => {
  const source = await read('src/pages/AdminDashboardPage.tsx')
  for (const marker of [
    'Doanh thu thực thu tháng này',
    'So với tháng trước',
    'MRR ước tính',
    'Pilot đang hoạt động',
    'Bản nháp',
    'Chờ duyệt',
    'Báo cáo đang mở',
    'Thùng rác',
    'Doanh thu B2C',
    'Doanh thu B2B',
    'Cập nhật lúc',
    'Đỉnh',
    'Bảng số liệu',
  ]) assert.match(source, new RegExp(marker))
  assert.match(source, /dashboardSummary\(\)[\s\S]*billingOverview\(6\)/)
  assert.match(source, /Promise\.allSettled/)
  assert.match(source, /to:\s*['"]\/admin\/(content|narrative-pilots|trash|billing)/)
  assert.match(source, /role="img"|sr-only/)
  const api = await read('src/features/admin/api.ts')
  assert.match(api, /billingOverview:[\s\S]{0,240}\/api\/admin\/billing\/overview/)
  assert.match(api, /Array\.isArray\(data\.monthlyRevenue\)/)
})

test('content keeps six tabs and uses the paged content-report workflow', async () => {
  const [page, reports, api] = await Promise.all([
    read('src/pages/AdminContentPage.tsx'),
    read('src/components/admin/AdminContentReportsPanel.tsx'),
    read('src/features/admin/api.ts'),
  ])
  for (const tab of ['discovery', 'artifacts', 'quests', 'panoramas', 'stations', 'reports']) {
    assert.match(page, new RegExp(`['"]${tab}['"]`))
  }
  for (const marker of ['AdminPagination', 'from', 'to', 'adminNote', 'rowVersion', 'updateContentReport', 'AdminModal']) {
    assert.match(reports, new RegExp(marker))
  }
  assert.match(api, /listContentReports:\s*\(query/)
  assert.match(api, /getPageData<AdminContentReport>/)
  assert.match(api, /updateContentReport:/)
  assert.doesNotMatch(page, /\+\s*1\s*\}/)
  assert.doesNotMatch(page, /id:\s*['"]stations['"][^\n]+count:\s*6/)
  assert.doesNotMatch(page, /id:\s*['"]reports['"][^\n]+count:\s*0/)
})

test('narrative is Vietnamese, location-aware, and server-paged without losing version workflow', async () => {
  const [page, editor] = await Promise.all([read('src/pages/AdminNarrativePilotsPage.tsx'), read('src/components/admin/NarrativeGraphEditor.tsx')])
  for (const marker of ['Độ sẵn sàng', 'Sơ đồ', 'Nguồn & trích dẫn', 'Phần thưởng & kết thúc', 'Lịch sử', 'locationId', 'sort', 'AdminPagination']) {
    assert.match(page, new RegExp(marker))
  }
  assert.match(page, /Phiên bản đã phát hành/)
  for (const english of ['>Readiness<', '>Graph<', '>Reward & ending<']) assert.doesNotMatch(page, new RegExp(english))
  for (const visibleEnglish of ['JSON export', 'Graph draft', 'Nguồn & citation', 'Reward & ending', 'Published (active)', 'Last QR']) {
    assert.doesNotMatch(`${page}\n${editor}`, new RegExp(visibleEnglish.replace(/[()]/g, '\\$&')))
  }
})

test('trash explains restore conflicts, shows deleter name, and announces badge invalidation', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminTrashPage.tsx'), read('src/features/admin/api.ts')])
  assert.match(page, /deletedByName/)
  assert.match(page, /PARENT_DELETED/)
  assert.match(page, /RESTORE_CONFLICT|unique/i)
  assert.match(page, /dispatchAdminTrashChanged/)
  assert.match(api, /deletedByName\?:/)
})

test('users expose URL filters and guarded role changes', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminUsersPage.tsx'), read('src/features/admin/api.ts')])
  for (const marker of ['q', 'role', 'tier', 'verified', 'expectedRole', 'reason', 'Vai trò hiện tại', 'Vai trò mới', 'quản trị viên cuối cùng']) {
    assert.match(page, new RegExp(marker, 'i'))
  }
  assert.match(page, /disabled=\{user\.id\s*===\s*currentUserId/)
  assert.match(api, /updateRole:[\s\S]{0,160}reason[\s\S]{0,160}expectedRole/)
})

test('organizations use URL-backed paging and only show supported roster aggregates', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminOrganizationsPage.tsx'), read('src/features/admin/api.ts')])
  for (const marker of ['useSearchParams', 'AdminPagination', 'plan', 'status', 'q']) assert.match(page, new RegExp(marker))
  assert.match(api, /listOrganizations:\s*\(query/)
  assert.doesNotMatch(page, /orgType|\/teacher/)
})

test('billing has three real-data regions with paged payments and inquiry CRM', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminBillingPage.tsx'), read('src/features/admin/api.ts')])
  for (const marker of [
    'Tổng quan doanh thu',
    'Giao dịch',
    'Cài đặt & CRM',
    'AdminChart',
    'Doanh thu thực thu',
    'MRR ước tính',
    'ARR ước tính',
    'Độ phủ',
    'Đang trả phí',
    'adminNotes',
    'Phễu yêu cầu thương mại',
    'Kanban board',
    'Xuất đối soát CSV',
  ]) {
    assert.match(page, new RegExp(marker))
  }
  assert.match(page, /useSearchParams/)
  assert.match(page, /billingOverview\(/)
  assert.match(page, /listPayments\(/)
  assert.match(page, /listB2b2cInquiries\(/)
  assert.match(api, /listPayments:\s*\(query/)
  assert.match(api, /listB2b2cInquiries:\s*\(query/)
  assert.doesNotMatch(page, /roadmap|JSON\.stringify/i)
  // Stitch mock ledger copy must not ship as hard-coded demo rows
  assert.doesNotMatch(page, /TXN-883190|2\.450\.800\.000/)
})

test('analytics uses URL location and range with independent accessible sections', async () => {
  const page = await read('src/pages/AdminAnalyticsPage.tsx')
  for (const marker of [
    'useSearchParams',
    'locationId',
    'range',
    'Mở khóa POI',
    'Phễu nhiệm vụ',
    'Điểm rời hành trình',
    'Chất lượng phiên',
    'Ẩn để bảo vệ riêng tư',
    'Quest Funnel',
    'Live Sync',
    'Mật độ theo giờ trong tuần',
    'Đỉnh sáng',
    'Đỉnh chiều',
  ]) {
    assert.match(page, new RegExp(marker))
  }
  assert.match(page, /Promise\.allSettled/)
  assert.doesNotMatch(page, /CU_CHI_LOCATION_ID/)
  assert.doesNotMatch(page, /AdminChart|Hoạt động theo sự kiện|Chuyển đổi trực tuyến sang tại chỗ/)
})

test('audit has URL date filters, masked actor identity, explicit details, and structured changes first', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminAuditPage.tsx'), read('src/features/admin/api.ts')])
  for (const marker of ['from', 'to', 'actor', 'entityType', 'action', 'actorEmailMasked', 'Xem chi tiết', 'Trước thay đổi', 'Sau thay đổi', 'Dữ liệu kỹ thuật']) {
    assert.match(page, new RegExp(marker))
  }
  assert.match(page, /searchParams\.get\(['"]actor['"]\)/)
  assert.match(page, /next\.set\(['"]actor['"],\s*nextActor\)/)
  assert.doesNotMatch(page, /searchParams\.get\(['"]actorId['"]\)|next\.set\(['"]actorId['"]\)/)
  assert.match(page, /aria-label="Tìm người thực hiện theo tên hoặc email"/)
  assert.match(api, /listAudit:[\s\S]{0,180}actor\?:\s*string[\s\S]{0,180}actorId\?:\s*string/)
  assert.match(api, /actor:\s*query\.actor\s*\|\|\s*query\.actorId\s*\|\|\s*undefined/)
  assert.ok(page.indexOf('Trước thay đổi') < page.indexOf('Dữ liệu kỹ thuật'))
  assert.ok(page.indexOf('Sau thay đổi') < page.indexOf('Dữ liệu kỹ thuật'))
  assert.doesNotMatch(page, /<tr[^>]+role="button"/)
  assert.match(page, /<button type="button"[^>]+>Xem chi tiết<\/button>/)
})

test('foundation closes drawer at md, refreshes trash badge, initializes motion synchronously, and preserves all field descriptions', async () => {
  const [layout, trash, motion, field, state] = await Promise.all([
    read('src/components/admin/AdminConsoleLayout.tsx'),
    read('src/pages/AdminTrashPage.tsx'),
    read('src/components/admin/adminChartMotion.ts'),
    read('src/components/admin/FormField.tsx'),
    read('src/features/admin/state.ts'),
  ])
  assert.match(layout, /matchMedia\(['"]\(min-width:\s*768px\)['"]\)/)
  assert.match(layout, /ADMIN_TRASH_CHANGED_EVENT/)
  assert.match(trash, /dispatchAdminTrashChanged/)
  assert.match(motion, /useState\(\(\)\s*=>[\s\S]{0,100}matchMedia/)
  assert.match(field, /hintId/)
  assert.match(field, /hint\s*\?\s*hintId[\s\S]{0,60}error\s*\?\s*errorId/)
  assert.match(layout, /--admin-header-height/)
  assert.doesNotMatch(state, /shouldKeepAdminFormOpen/)
})
