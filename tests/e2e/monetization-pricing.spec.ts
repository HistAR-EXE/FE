import { test, expect } from '@playwright/test'
import { authHeaders, login, registerFreshUser, unwrap } from '../helpers/api'
import { ADMIN_USER, BE_URL, SEED } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('Monetization P0 smoke', () => {
  test('pricing page renders B2C and B2B sections', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto('/pricing')
    await expect(page.getByRole('heading', { name: /Gói TimeLens/i })).toBeVisible()
    await expect(page.getByText('B2C — Cá nhân')).toBeVisible()
    await expect(page.getByText('B2B — Trường học')).toBeVisible()
    await expect(page.getByText('49.000đ/tháng')).toBeVisible()
  })

  test('free user hits era lock and can go to pricing', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto(`/time-portal/${SEED.cuChiLocationId}`)
    await page.getByRole('button', { name: '1948' }).click()
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toBeVisible()
    await page.getByRole('link', { name: /Nâng cấp ngay|Nâng cấp Premium/i }).click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('free user sees leaderboard upgrade gate', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto('/leaderboard')
    await expect(page.getByRole('heading', { name: /Bảng xếp hạng toàn cộng đồng/i })).toBeVisible()
    await expect(page.getByText(/Nâng cấp Premium/i).first()).toBeVisible()
  })

  test('org member sees org quota modal not B2C upsell', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.addInitScript(() => {
      localStorage.setItem('timelens_org_id', '11111111-1111-1111-1111-111111111111')
    })
    await page.route('**/api/chat/messages', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'QUOTA_EXCEEDED',
          type: 'ORG_MONTHLY',
          upgradePackage: 'STANDARD',
          message: 'Tổ chức đã dùng hết 5000 lượt AI trong tháng',
          upgradeUrl: '/pricing',
        }),
      })
    })
    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"]').fill('Test org quota')
    await page.getByRole('button', { name: 'send', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Hết lượt AI của trường/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Nâng cấp 49/i })).toHaveCount(0)
  })

  test('chat quota modal routes user to pricing', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.route('**/api/chat/messages', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'QUOTA_EXCEEDED',
          message: 'Đã đạt giới hạn 10 tin nhắn/ngày',
          upgradeUrl: '/pricing',
        }),
      })
    })

    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"]').fill('Kể tôi nghe về Củ Chi')
    await page.getByRole('button', { name: 'send', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Hết lượt chat hôm nay/i })).toBeVisible()
    await page.getByRole('button', { name: /Nâng cấp 49/i }).click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('b2c checkout upgrades user and returns to requested surface', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    const returnPath = `/time-portal/${SEED.cuChiLocationId}`
    let statusChecks = 0

    await page.route('**/api/billing/b2c/payment', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            provider: 'SEPAY',
            orderCode: 'HSTMOCK1234',
            transferContent: 'HSTMOCK1234',
            amountVnd: 49000,
            bankCode: 'Vietcombank',
            accountNumber: '0010000000355',
            accountName: 'CONG TY HISTAR',
            qrUrl: 'https://vietqr.app/img?acc=0010000000355&bank=Vietcombank&amount=49000&des=HSTMOCK1234',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            status: 'PENDING',
          },
        }),
      })
    })
    await page.route('**/api/billing/b2c/payment/HSTMOCK1234', async (route) => {
      statusChecks += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderCode: 'HSTMOCK1234',
            status: statusChecks > 1 ? 'PAID' : 'PENDING',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            paidAt: statusChecks > 1 ? new Date().toISOString() : null,
            returnToPath: returnPath,
            upgraded: statusChecks > 1,
          },
        }),
      })
    })
    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: user.userId,
            email: user.email,
            displayName: user.displayName,
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
          },
        }),
      })
    })

    await page.goto(`/checkout/b2c?next=${encodeURIComponent(returnPath)}`)
    await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()
    await expect(page.getByText(/Mã thanh toán: HSTMOCK1234/i)).toBeVisible()
    // MON-PAY-UI01 / MON-PAY-UI02
    await expect(page.getByRole('button', { name: /Kiểm tra lại trạng thái/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tôi đã thanh toán/i })).toHaveCount(0)
    await expect(page.getByText(/Hệ thống sẽ tự mở khóa Premium sau khi webhook SePay tới backend/i)).toBeVisible()
    await expect(page.getByText(/Local: cần webhook public\/tunnel hoặc test hook để backend nhận thanh toán/i)).toBeVisible()
    await page.getByRole('button', { name: /Kiểm tra lại trạng thái/i }).click()
    await page.getByRole('button', { name: /Kiểm tra lại trạng thái/i }).click()
    await expect(page).toHaveURL(new RegExp(returnPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  })

  test('MON-PAY-UI03: B2C silent 5s poll flips PENDING → PAID without manual click', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    const returnPath = `/time-portal/${SEED.cuChiLocationId}`
    let statusChecks = 0
    await page.route('**/api/billing/b2c/payment', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            provider: 'SEPAY',
            orderCode: 'HSTPOLL5S',
            transferContent: 'HSTPOLL5S',
            amountVnd: 49000,
            bankCode: 'Vietcombank',
            accountNumber: '0010000000355',
            accountName: 'CONG TY HISTAR',
            qrUrl: 'https://vietqr.app/img?acc=0010000000355&bank=Vietcombank&amount=49000&des=HSTPOLL5S',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            status: 'PENDING',
          },
        }),
      })
    })
    await page.route('**/api/billing/b2c/payment/HSTPOLL5S', async (route) => {
      statusChecks += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderCode: 'HSTPOLL5S',
            status: statusChecks >= 2 ? 'PAID' : 'PENDING',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            paidAt: statusChecks >= 2 ? new Date().toISOString() : null,
            returnToPath: returnPath,
            upgraded: statusChecks >= 2,
          },
        }),
      })
    })
    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: user.userId,
            email: user.email,
            displayName: user.displayName,
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
          },
        }),
      })
    })
    await page.goto(`/checkout/b2c?next=${encodeURIComponent(returnPath)}`)
    await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()
    await expect(page.getByText(/Mã thanh toán: HSTPOLL5S/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Tôi đã thanh toán/i })).toHaveCount(0)
    // Silent poll every 5s should upgrade without clicking refresh.
    await expect(page).toHaveURL(new RegExp(returnPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
      timeout: 20_000,
    })
    expect(statusChecks).toBeGreaterThanOrEqual(2)
  })

  test('premium settings shows b2c history and allows cancel', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    const subscribeRes = await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
      headers: authHeaders(user.token),
      data: { paymentMethod: 'SEPAY' },
    })
    await unwrap(subscribeRes)
    await page.goto('/settings')

    await expect(page.getByText(/Gói Premium đang hoạt động/i)).toBeVisible()
    await expect(page.getByText(/Lịch sử gói B2C/i)).toBeVisible()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Hủy Premium/i }).click()
    await expect(page.getByText(/Bạn đang ở gói FREE/i)).toBeVisible({ timeout: 20_000 })
  })

  test('b2b checkout creates teacher org and shows dashboard stats', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    const orgName = `THPT E2E ${Date.now()}`
    const orgId = '7a65ea5b-93ee-4a15-97f1-4c3432718888'
    let statusChecks = 0

    await page.route('**/api/billing/org/plans', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { planType: 'MICRO', label: 'Micro', priceVnd: 8000000, maxCcu: 15, maxVerifiedAccounts: 100, maxAiQueriesPerMonth: 5000 },
            { planType: 'STANDARD', label: 'Standard', priceVnd: 15000000, maxCcu: 40, maxVerifiedAccounts: 400, maxAiQueriesPerMonth: 30000 },
            { planType: 'PREMIUM', label: 'Premium', priceVnd: 25000000, maxCcu: 80, maxVerifiedAccounts: 1000, maxAiQueriesPerMonth: null },
          ],
        }),
      })
    })
    await page.route('**/api/billing/org/payment', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            provider: 'SEPAY',
            orderCode: 'ORGMOCK1234',
            transferContent: 'ORGMOCK1234',
            amountVnd: 15000000,
            bankCode: 'MBBank',
            accountNumber: '0815330544',
            accountName: 'DANG THUAN PHAT',
            qrUrl: 'https://vietqr.app/img?acc=0815330544&bank=MBBank&amount=15000000&des=ORGMOCK1234',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            status: 'PENDING',
            planType: 'STANDARD',
            organizationId: null,
            orgName,
          },
        }),
      })
    })
    await page.route('**/api/billing/org/payment/ORGMOCK1234', async (route) => {
      statusChecks += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderCode: 'ORGMOCK1234',
            status: statusChecks > 1 ? 'PAID' : 'PENDING',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            paidAt: statusChecks > 1 ? new Date().toISOString() : null,
            returnToPath: '/teacher',
            activated: statusChecks > 1,
            organizationId: orgId,
            planType: 'STANDARD',
            orgName,
          },
        }),
      })
    })
    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: user.userId,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: null,
            role: 'TEACHER',
            tier: 'FREE',
            orgId,
            orgName,
            orgSubscription: 'STANDARD',
            orgRole: 'teacher',
            level: 1,
            totalPoints: 0,
            city: null,
            emailVerified: true,
          },
        }),
      })
    })
    await page.route('**/api/org/mine', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ organizationId: orgId, name: orgName, orgRole: 'teacher' }] }),
      })
    })
    await page.route(`**/api/org/${orgId}/analytics`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { organizationId: orgId, name: orgName, orgType: 'SCHOOL', memberCount: 1, completionRatePct: 0, fullTourRatePct: 0, note: 'ok' },
        }),
      })
    })
    await page.route(`**/api/org/${orgId}/roster`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
    })
    await page.route(`**/api/org/${orgId}/invite-code`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { organizationId: orgId, inviteCode: 'A1B2C3', expiresAt: new Date(Date.now() + 86400000).toISOString(), inviteUrl: '/join?code=A1B2C3' },
        }),
      })
    })
    await page.route(`**/api/org/${orgId}/dashboard-stats`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            organizationId: orgId,
            orgName,
            planType: 'STANDARD',
            endDate: '2027-07-07',
            isActive: true,
            aiQueriesUsed: 0,
            aiQueriesLimit: 30000,
            quotaResetsOn: '2026-08-01',
            verifiedAccounts: 1,
            maxVerifiedAccounts: 400,
            accountLimitReached: false,
            ccuCurrent: 0,
            maxCcu: 40,
            ccuLimitReached: false,
            daysUntilExpiry: 365,
          },
        }),
      })
    })

    await page.goto('/checkout/b2b?plan=STANDARD')
    await page.getByPlaceholder('THPT Nguyễn Du').fill(orgName)
    await page.getByPlaceholder('giaovien@truong.edu.vn').fill(`teacher_${Date.now()}@histar.vn`)
    await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()
    await expect(page.getByText(/Mã thanh toán: ORGMOCK1234/i)).toBeVisible()
    // MON-PAY-UI01 / MON-PAY-UI02 (B2B)
    await expect(page.getByRole('button', { name: /Kiểm tra lại trạng thái/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tôi đã thanh toán/i })).toHaveCount(0)
    await expect(page.getByText(/Deploy: backend public sẽ nhận webhook SePay, nút này chỉ dùng để refresh nếu webhook tới chậm/i)).toBeVisible()
    await page.getByRole('button', { name: /Kiểm tra lại trạng thái/i }).click()
    await page.getByRole('button', { name: /Kiểm tra lại trạng thái/i }).click()

    await expect(page).toHaveURL(/\/teacher$/, { timeout: 20_000 })
    await expect(page.getByText(/Tài khoản đã cấp/i)).toBeVisible()
    await expect(page.getByText(/AI queries tháng/i)).toBeVisible()
    await expect(page.getByText(/Reset:/i)).toBeVisible()
    await expect(page.getByText(/Mã mời tổ chức/i)).toBeVisible()
  })

  test('TRIAL-H02-UI: leaderboard shows archive message instead of crashing on expired-trial 403', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.route('**/api/leaderboard**', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'TRIAL_EXPIRED',
          message: 'Lớp học dùng thử đã hết hạn. Dữ liệu bảng xếp hạng chỉ còn ở chế độ lưu trữ.',
        }),
      })
    })

    await page.goto('/leaderboard')
    await expect(page.getByText(/chế độ lưu trữ/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /Bảng Vinh Danh/i })).toBeVisible()
  })

  test('invite link joins org and suppresses B2C upsell path', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `THPT Invite ${Date.now()}`
    const subscribeRes = await request.post(`${BE_URL}/api/billing/org/subscribe`, {
      headers: authHeaders(teacher.token),
      data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
    })
    await unwrap(subscribeRes)

    const inviteRes = await request.post(`${BE_URL}/api/org/invite`, {
      headers: authHeaders(teacher.token),
    })
    const invite = await unwrap<{ inviteCode: string; inviteUrl: string }>(inviteRes)

    const student = await registerFreshUser(request)
    await seedSession(page, student, { mode: 'online' })
    await page.goto(`/join?code=${invite.inviteCode}`)

    await expect(page).toHaveURL(/\/home/, { timeout: 20_000 })
    await page.goto('/settings')
    await expect(page.getByText(/Đang thuộc:/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /Gói Premium/i })).toHaveCount(0)
  })

  test('admin billing page reads and updates B2C runtime price', async ({ page, request }) => {
    const admin = await login(request, ADMIN_USER)
    await seedSession(page, admin, { mode: 'online' })

    let currentPrice = 49_000
    let patchedPrice: number | null = null

    await page.route('**/api/admin/billing/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              b2cPremiumPriceVnd: currentPrice,
              chatFreeDailyLimit: 10,
              orgVolumeDiscountPercent: 35,
              orgVolumeDiscountMinLicenses: 3,
              bankCode: 'MBBank',
              accountNumber: '0815330544',
              accountName: 'DANG THUAN PHAT',
              qrTemplate: 'compact',
              qrShowInfo: true,
              updatedAt: '2026-07-07T10:00:00Z',
            },
          }),
        })
        return
      }

      const body = route.request().postDataJSON() as { b2cPremiumPriceVnd?: number; chatFreeDailyLimit?: number }
      if (body.b2cPremiumPriceVnd != null) {
        patchedPrice = body.b2cPremiumPriceVnd
        currentPrice = patchedPrice
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            b2cPremiumPriceVnd: currentPrice,
            chatFreeDailyLimit: body.chatFreeDailyLimit ?? 10,
            bankCode: 'MBBank',
            accountNumber: '0815330544',
            accountName: 'DANG THUAN PHAT',
            qrTemplate: 'compact',
            qrShowInfo: true,
            updatedAt: '2026-07-07T10:05:00Z',
          },
        }),
      })
    })

    await page.goto('/admin/billing')
    await expect(page.getByRole('heading', { name: /Billing settings/i })).toBeVisible()
    const priceInput = page.locator('input[type="number"]').first()
    await expect(priceInput).toBeVisible()
    await expect(priceInput).toHaveValue('49000')
    await expect(page.getByText(/49\.000đ\/tháng/i)).toBeVisible()

    await priceInput.fill('59000')
    await expect(page.getByText(/59\.000đ\/tháng/i)).toBeVisible()
    await page.getByRole('button', { name: /Lưu giá mới/i }).click()

    await expect.poll(() => patchedPrice).toBe(59_000)
    await expect(priceInput).toHaveValue('59000')
    await expect(page.getByText(/Giá hiện tại từ backend:/i)).toContainText('59.000đ')
  })

  test('b2b checkout shows volume discount preview for 3 licenses', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.route('**/api/billing/org/volume-preview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            planType: 'STANDARD',
            licenseCount: 3,
            unitPriceVnd: 15_000_000,
            subtotalVnd: 45_000_000,
            discountPercent: 35,
            discountAmountVnd: 15_750_000,
            totalVnd: 29_250_000,
          },
        }),
      })
    })
    await page.goto('/checkout/b2b?plan=STANDARD&licenses=3')
    await expect(page.getByText(/Volume discount 35%/i)).toBeVisible()
    await expect(page.getByText(/29\.250\.000đ/i)).toBeVisible()
  })

  test('b2b2c inquiry page renders', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto('/checkout/b2b2c')
    await expect(page.getByRole('heading', { name: /số hóa di tích/i })).toBeVisible()
  })
})
