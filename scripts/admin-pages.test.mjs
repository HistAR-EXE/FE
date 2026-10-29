import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { formatRevenueTick, getRevenueAxis } from '../src/pages/revenueAxis.ts'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('revenue chart picks five readable intervals above the highest bar', () => {
  assert.deepEqual(getRevenueAxis([200_000, 450_000, 300_000]), {
    maximum: 500_000,
    ticks: [0, 100_000, 200_000, 300_000, 400_000, 500_000],
  })
  assert.deepEqual(getRevenueAxis([5_000_000, 23_000_000]).ticks, [0, 5_000_000, 10_000_000, 15_000_000, 20_000_000, 25_000_000])
  assert.deepEqual(getRevenueAxis([0, 0]), { maximum: 0, ticks: [0] })
  assert.equal(formatRevenueTick(500_000), '500 nghìn')
  assert.equal(formatRevenueTick(25_000_000), '25 triệu')
})

test('demo builds show a global, unmistakable data label', async () => {
  const [app, banner] = await Promise.all([
    read('src/App.tsx'),
    read('src/components/demo/DemoEnvironmentBanner.tsx'),
  ])
  assert.match(app, /DemoEnvironmentBanner/)
  assert.match(banner, /appEnv\.demoMode/)
  assert.match(banner, /Dữ liệu demo/)
  assert.match(banner, /aria-live=["']polite["']/)
})

test('real admin opens a short-lived session in the isolated demo', async () => {
  const [page, adminApi, authApi, route] = await Promise.all([
    read('src/pages/AdminUsersPage.tsx'),
    read('src/features/admin/api.ts'),
    read('src/features/auth/api.ts'),
    read('src/pages/DemoAdminSessionPage.tsx'),
  ])
  assert.match(page, /Mở quản trị demo \(15 phút\)/)
  assert.match(adminApi, /\/api\/admin\/demo-session/)
  assert.match(authApi, /\/api\/demo\/admin-session\/exchange/)
  assert.match(route, /appEnv\.demoMode/)
  assert.match(route, /acceptSession/)
})

test('dashboard separates operational and commercial data with accessible revenue history', async () => {
  const source = await read('src/pages/AdminDashboardPage.tsx')
  for (const marker of [
    'Doanh thu thực thu tháng này',
    'Thay đổi so với tháng trước',
    'Doanh thu định kỳ tháng',
    'Kịch bản đang hoạt động',
    'Bản nháp đang mở',
    'Chờ duyệt',
    'Báo cáo đang mở',
    'Thùng rác',
    'Khách cá nhân',
    'Tổ chức',
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
  assert.match(api, /AdminDashboardSummary[\s\S]{0,300}contentReportsLast30Days:\s*number/)
  assert.match(api, /AdminDashboardSummary[\s\S]{0,300}openContentReports:\s*number/)
  assert.match(source, /label:\s*['"]Bản nháp đang mở['"][\s\S]{0,160}value:\s*operations\.draftCount[\s\S]{0,160}to:\s*['"]\/admin\/narrative-pilots['"]/)
  assert.match(source, /label:\s*['"]Chờ duyệt['"][\s\S]{0,160}value:\s*operations\.reviewPendingCount[\s\S]{0,160}reviewStatus=DRAFT/)
  assert.match(source, /label:\s*['"]Báo cáo đang mở['"][\s\S]{0,160}value:\s*operations\.openContentReports/)
  assert.doesNotMatch(source, /value:\s*operations\.contentReportsLast30Days/)
  assert.match(source, /mom == null \? ['"]Chưa có MoM['"]|mom == null \? ['"]—['"]|mom == null \? \(/)
  assert.doesNotMatch(source, /Math\.abs\(mom \?\? 0\)/)
  assert.doesNotMatch(source, /width:\s*`\$\{[^}]*mom[^}]*\}`/)
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

test('artifact admin CRUD exposes complete content metadata and preserves optimistic lock drafts', async () => {
  const [page, api] = await Promise.all([
    read('src/pages/AdminContentPage.tsx'),
    read('src/features/admin/api.ts'),
  ])

  for (const field of [
    'story',
    'collectionName',
    'rarity',
    'sourceUrl',
    'imageSource',
    'imageLicense',
    'factVerified',
    'unlockMinigameId',
  ]) {
    assert.match(api, new RegExp(field))
    assert.match(page, new RegExp(field))
  }
  assert.match(page, /rowVersion.*initial\?\.rowVersion|initial\?\.rowVersion.*rowVersion/)
  assert.match(page, /updateArtifact\(id, body, body\.rowVersion/)
  assert.match(api, /deleteImpact:[\s\S]{0,180}contentPath\(type\)/)
  assert.match(api, /softDeleteContent:[\s\S]{0,180}httpClient\.delete/)
  assert.match(api, /restoreContent:[\s\S]{0,180}\/restore/)
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

test('narrative admin exposes destination readiness, rollback, and structured gate errors', async () => {
  const [page, api, contracts] = await Promise.all([
    read('src/pages/AdminNarrativePilotsPage.tsx'),
    read('src/features/admin/api.ts'),
    read('src/shared/api/contracts.ts'),
  ])
  for (const marker of [
    'Kiểm tra điểm đến',
    'Tour 360°',
    'Phỏng vấn AI',
    'Đối chiếu nguồn',
    'Khôi phục pilot',
    'rollbackAction',
    'gateErrors',
  ]) assert.match(page, new RegExp(marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')))
  assert.match(api, /NarrativeGateError/)
  assert.match(api, /rollbackNarrative:/)
  assert.match(api, /QuestCampaignResponse|AdminQuestCampaign/)
  assert.match(api, /rollbackCampaign:/)
  assert.match(api, /previewCampaignAudience:/)
  assert.match(contracts, /StructuredGateError/)
  assert.match(contracts, /gateErrors\?:/)
})

test('trash explains restore conflicts, shows deleter name, and announces badge invalidation', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminTrashPage.tsx'), read('src/features/admin/api.ts')])
  assert.match(page, /deletedByName/)
  assert.match(page, /PARENT_DELETED/)
  assert.match(page, /RESTORE_CONFLICT|unique/i)
  assert.match(page, /dispatchAdminTrashChanged/)
  assert.match(page, /purgeTrashItem/)
  assert.match(page, /bulkTrash/)
  assert.match(page, /emptyTrash/)
  assert.match(page, /Khôi phục đã chọn/)
  assert.match(page, /Xóa vĩnh viễn đã chọn/)
  assert.doesNotMatch(page, /Chưa có API dọn sạch/)
  assert.match(api, /deletedByName\?:/)
  assert.match(api, /purgeTrashItem:/)
  assert.match(api, /bulkTrash:/)
  assert.match(api, /emptyTrash:/)
})

test('users expose URL filters and guarded role changes', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminUsersPage.tsx'), read('src/features/admin/api.ts')])
  for (const marker of ['q', 'role', 'tier', 'verified', 'expectedRole', 'reason', 'Vai trò hiện tại', 'Vai trò mới', 'quản trị viên cuối cùng']) {
    assert.match(page, new RegExp(marker, 'i'))
  }
  assert.match(page, /disabled=\{user\.id\s*===\s*currentUserId/)
  assert.match(api, /updateRole:[\s\S]{0,160}reason[\s\S]{0,160}expectedRole/)
})

test('users expose a guarded demo dataset preview and purge workflow', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminUsersPage.tsx'), read('src/features/admin/api.ts')])
  for (const marker of [
    'Dữ liệu demo',
    'Xóa toàn bộ bộ demo',
    'operationalRowCount',
    'purgeDemoDataset',
    'userId',
    'reason',
  ]) assert.match(`${page}\n${api}`, new RegExp(marker))
  assert.match(api, /\/api\/admin\/demo-dataset/)
  assert.match(page, /demoDataset\.enabled/)
  assert.match(page, /demoAccountToDelete/)
})

test('production admin controls demo lifecycle with activity-aware confirmation', async () => {
  const [page, api, heartbeat, state] = await Promise.all([
    read('src/pages/AdminUsersPage.tsx'),
    read('src/features/admin/api.ts'),
    read('src/components/demo/DemoActivityHeartbeat.tsx'),
    read('src/features/admin/demoEnvironmentState.ts'),
  ])
  for (const marker of ['Bật môi trường demo', 'Tắt môi trường demo', 'activeUsers']) {
    assert.match(page, new RegExp(marker))
  }
  assert.match(state, /TẮT DEMO/)
  assert.match(api, /\/api\/admin\/demo-environment/)
  assert.match(api, /\/api\/demo\/activity\/heartbeat/)
  assert.match(heartbeat, /60_000/)
  assert.match(heartbeat, /visibilityState/)
})

test('organizations use URL-backed paging and only show supported roster aggregates', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminOrganizationsPage.tsx'), read('src/features/admin/api.ts')])
  for (const marker of ['useSearchParams', 'AdminPagination', 'plan', 'status', 'q']) assert.match(page, new RegExp(marker))
  assert.match(api, /listOrganizations:\s*\(query/)
  assert.doesNotMatch(page, /orgType|\/teacher/)
  for (const marker of [
    'listOrgContracts',
    'getOrgArReport',
    'listOrgActivityLogs',
    'syncOrgCrm',
    'issueOrgArCards',
    'issueOrgCertificates',
    'Hợp đồng & giấy phép',
    'Báo cáo ngoại khóa AR',
    'Nhật ký tổ chức',
    'Đồng bộ CRM',
    'Cấp thẻ AR',
    'Cấp chứng nhận hàng loạt',
  ]) {
    assert.match(page, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.doesNotMatch(page, /unavailable|chưa có endpoint/i)
  assert.match(api, /listOrgContracts:\s*\(orgId/)
  assert.match(api, /syncOrgCrm:\s*\(orgId/)
  assert.match(api, /issueOrgCertificates:\s*\(orgId/)
})

test('billing has three real-data regions with paged payments and inquiry CRM', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminBillingPage.tsx'), read('src/features/admin/api.ts')])
  for (const marker of [
    'Tổng quan doanh thu',
    'Giao dịch',
    'Cài đặt & CRM',
    'AdminChart',
    'Doanh thu thực thu',
    'Doanh thu định kỳ tháng',
    'Doanh thu định kỳ năm',
    'Độ phủ',
    'Đang trả phí',
    'adminNotes',
    'Yêu cầu tư vấn số hóa di sản',
    'Bảng giai đoạn',
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

test('billing uses server payment actions, filtered blob export, and organization deep links', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminBillingPage.tsx'), read('src/features/admin/api.ts')])

  assert.match(api, /AdminB2b2cInquiry[\s\S]{0,500}organizationId\?:\s*string\s*\|\s*null/)
  assert.match(api, /markPaymentPaid:/)
  assert.match(api, /refundPayment:/)
  assert.match(api, /voidPayment:/)
  assert.match(api, /exportPaymentsCsv:/)
  assert.match(api, /billing\/payments\/export\.csv[\s\S]{0,180}responseType:\s*['"]blob['"]/)

  for (const marker of [
    'getPaymentActionsForStatus',
    'validatePaymentActionReason',
    'markPaymentPaid',
    'refundPayment',
    'voidPayment',
    'paymentActionOpen',
    'aria-describedby',
    'organizationId',
  ]) assert.match(page, new RegExp(marker))
  assert.ok(page.includes('/admin/organizations?orgId='))

  assert.match(page, /exportPaymentsCsv\(\{[\s\S]{0,220}status:\s*paymentStatus\s*\|\|\s*undefined[\s\S]{0,120}channel:\s*channel\s*\|\|\s*undefined/)
  assert.doesNotMatch(page, /exportPaymentsCsv\(payments\.items\)/)
})

test('billing payment operations use the row channel and expose backend terminal statuses', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminBillingPage.tsx'), read('src/features/admin/api.ts')])

  for (const [method, operation] of [
    ['markPaymentPaid', 'mark-paid'],
    ['refundPayment', 'refund'],
    ['voidPayment', 'void'],
  ]) {
    assert.match(api, new RegExp(`${method}:\\s*\\(channel:\\s*string,\\s*id:\\s*string,\\s*reason:\\s*string\\)`))
    assert.ok(api.includes(`/api/admin/billing/payments/\${channel.toLowerCase()}/\${id}/${operation}`))
    assert.match(page, new RegExp(`adminApi\\.${method}\\(item\\.channel\\s*\\?\\?\\s*['"]['"],\\s*item\\.id,`))
  }

  for (const [status, label] of [
    ['REFUNDED', 'Đã hoàn tiền'],
    ['VOIDED', 'Đã hủy'],
  ]) {
    assert.match(page, new RegExp(`id:\\s*['"]${status}['"][^\\n]+status:\\s*['"]${status}['"]`))
    assert.match(page, new RegExp(`key\\s*===\\s*['"]${status}['"][\\s\\S]{0,160}label:\\s*['"]${label}['"]`))
    assert.match(page, new RegExp(`status:\\s*['"]${status}['"]`))
  }
})

test('billing mutations use the operation response contract and refresh server-backed data', async () => {
  const [page, api] = await Promise.all([read('src/pages/AdminBillingPage.tsx'), read('src/features/admin/api.ts')])

  assert.match(
    api,
    /export type AdminPaymentOperationResponse\s*=\s*\{[\s\S]{0,400}id:\s*string[\s\S]{0,120}channel:\s*string[\s\S]{0,160}status:\s*string[\s\S]{0,120}paidAt:\s*string\s*\|\s*null/,
  )
  for (const method of ['markPaymentPaid', 'refundPayment', 'voidPayment']) {
    assert.match(api, new RegExp(`${method}:[\\s\\S]{0,180}getData<AdminPaymentOperationResponse>`))
  }

  assert.doesNotMatch(
    page,
    /\b(?:const|let)\s+\w+\s*=\s*await\s+adminApi\.(?:markPaymentPaid|refundPayment|voidPayment)\(/,
  )
  const refreshIndex = page.indexOf('await Promise.all([loadPayments(), loadPaymentFacets(), loadShell()])')
  assert.ok(refreshIndex > page.indexOf('adminApi.markPaymentPaid('))
  assert.ok(refreshIndex > page.indexOf('adminApi.refundPayment('))
  assert.ok(refreshIndex > page.indexOf('adminApi.voidPayment('))
})

test('analytics uses URL location and range with independent accessible sections', async () => {
  const page = await read('src/pages/AdminAnalyticsPage.tsx')
  for (const marker of [
    'useSearchParams',
    'locationId',
    'range',
    'Điểm di tích được ghi nhận nhiều nhất',
    'Tiến độ hoàn thành nhiệm vụ',
    'Điểm khách dừng hành trình',
    'Chất lượng phiên',
    'Ẩn để bảo vệ riêng tư',
    'Làm mới dữ liệu',
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
  const [page, api, users, orgs] = await Promise.all([
    read('src/pages/AdminAuditPage.tsx'),
    read('src/features/admin/api.ts'),
    read('src/pages/AdminUsersPage.tsx'),
    read('src/pages/AdminOrganizationsPage.tsx'),
  ])
  for (const marker of ['from', 'to', 'actor', 'entityType', 'action', 'actorEmailMasked', 'Xem chi tiết', 'Trước thay đổi', 'Sau thay đổi', 'Dữ liệu kỹ thuật']) {
    assert.match(page, new RegExp(marker))
  }
  assert.match(page, /searchParams\.get\(['"]actor['"]\)/)
  assert.match(page, /searchParams\.get\(['"]actorId['"]\)/)
  assert.match(page, /searchParams\.get\(['"]entityId['"]\)/)
  assert.match(page, /next\.set\(['"]actor['"],\s*nextActor\)/)
  assert.match(page, /verifyAuditIntegrity/)
  assert.match(page, /exportAuditJson/)
  assert.doesNotMatch(page, /Merkle chưa có|exportAuditJson\(result\.items/i)
  assert.match(page, /aria-label="Tìm người thực hiện theo tên hoặc email"/)
  assert.match(api, /verifyAuditIntegrity:/)
  assert.match(api, /exportAuditJson:/)
  assert.match(api, /actorId:\s*query\.actorId/)
  assert.match(api, /entityId:\s*entityIdFromQ/)
  assert.doesNotMatch(api, /actor:\s*query\.actor\s*\|\|\s*query\.actorId/)
  assert.match(users, /entityType=USER&entityId=/)
  assert.match(orgs, /entityType=ORGANIZATION&entityId=/)
  assert.match(orgs, /Mở Audit/)
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
