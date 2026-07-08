import { test, expect } from '@playwright/test'
import { isRagAiReady } from '../helpers/ai'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL, SEED } from '../helpers/constants'
import {
  confirmB2cPaymentViaWebhook,
  createB2cPaymentIntent,
} from '../helpers/sepay'
import {
  exhaustFreeDailyChatQuota,
  getCuChiCharacterId,
  getPremiumFrameId,
  sendChatMessage,
} from '../helpers/monetization'
import { seedSession } from '../helpers/session'
import { gotoTimePortalAndClickEra } from '../helpers/timePortal'

test.describe('E2E · Persona Khoa (GP-KHOA)', () => {
  test('GP-KHOA-00: guest /explore redirects to login with returnTo', async ({ page }) => {
    await page.goto('/explore')
    await expect(page).toHaveURL(/\/login\?.*returnTo=%2Fexplore|returnTo=%252Fexplore/)
  })

  test('GP-KHOA-01: landing → login → explore Củ Chi', async ({ page, request }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto('/explore')
    await expect(page).toHaveURL(/\/explore/)
    await expect(page.getByText(/Củ Chi/i).first()).toBeVisible({ timeout: 20_000 })
  })

  test('GP-KHOA-02: Time Portal era 1948 → EraLockedModal → Để sau', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await gotoTimePortalAndClickEra(page, SEED.cuChiLocationId, '1948')
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toBeVisible()
    await page.getByRole('button', { name: 'Để sau' }).click()
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toHaveCount(0)
  })

  test('GP-KHOA-03: chat hết quota → QuotaModal → /pricing', async ({ page, request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable')
    test.setTimeout(15 * 60_000)

    const user = await registerFreshUser(request)
    const characterId = await getCuChiCharacterId(request)
    await exhaustFreeDailyChatQuota(request, user.token, characterId, 10)

    await seedSession(page, user, { mode: 'online' })
    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"], input[placeholder*="Nhắn tin cho"]').fill('Tin thứ 11 — persona Khoa')
    await page.getByRole('button', { name: 'send', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Hết lượt chat hôm nay/i })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole('button', { name: /Nâng cấp 49/i }).click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('GP-KHOA-04: SePay B2C QR → webhook → tier PREMIUM', async ({ request }) => {
    const user = await registerFreshUser(request)
    const intent = await createB2cPaymentIntent(request, user.token, '/time-portal')
    expect(intent.qrUrl).toMatch(/amount=\d+/)

    const status = await confirmB2cPaymentViaWebhook(request, intent, user.token)
    expect(status.status).toBe('PAID')
    expect(status.upgraded).toBe(true)

    const profile = await unwrap<{ tier: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    expect(profile.tier).toBe('PREMIUM')
  })

  test('GP-KHOA-05: era 1948 unlock sau upgrade Premium', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    const intent = await createB2cPaymentIntent(request, user.token)
    await confirmB2cPaymentViaWebhook(request, intent, user.token)

    const profile = await unwrap<{ tier: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    await seedSession(page, { ...user, tier: profile.tier ?? 'PREMIUM' }, { mode: 'online' })

    await gotoTimePortalAndClickEra(page, SEED.cuChiLocationId, '1948')
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toHaveCount(0)
  })

  test('GP-KHOA-06: PREMIUM chat may return sources when RAG available', async ({ request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable')

    const user = await registerFreshUser(request)
    const intent = await createB2cPaymentIntent(request, user.token)
    await confirmB2cPaymentViaWebhook(request, intent, user.token)

    const characterId = await getCuChiCharacterId(request)
    const res = await sendChatMessage(
      request,
      user.token,
      characterId,
      'Nguồn tài liệu về địa đạo Củ Chi chi tiết?',
    )
    const data = await unwrap<{ reply: string; sources?: Array<{ title: string }> }>(res)
    expect(data.reply?.length).toBeGreaterThan(0)
    if (data.sources && data.sources.length > 0) {
      expect(data.sources[0].title).toBeTruthy()
    }
  })

  test('GP-KHOA-07: tour 360° Củ Chi load không crash', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto(`/tour/360/${SEED.cuChiLocationId}`)
    await expect(page).toHaveURL(new RegExp(`/tour/360/${SEED.cuChiLocationId}`))
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
    await expect(
      page.locator('main').getByText(/minh hoạ|bản đồ|panorama|360|Củ Chi/i).first(),
    ).toBeVisible({ timeout: 25_000 })
  })

  test('GP-KHOA-08: photo frame Premium theme enabled sau upgrade', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    const intent = await createB2cPaymentIntent(request, user.token)
    await confirmB2cPaymentViaWebhook(request, intent, user.token)

    const profile = await unwrap<{ tier: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    const premiumFrameId = await getPremiumFrameId(request)
    await seedSession(page, { ...user, tier: profile.tier ?? 'PREMIUM' }, { mode: 'online' })

    await page.goto('/photo-frame')
    await expect(page.getByRole('heading', { name: /Khung Hình Di Sản/i })).toBeVisible({
      timeout: 15_000,
    })
    await page.locator('select').selectOption(premiumFrameId)
    await expect(page.getByText(/Khung ảnh này dành cho gói Premium/i)).toHaveCount(0)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'frame-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })
    await expect(page.getByRole('button', { name: 'Tạo & Chia sẻ' })).toBeEnabled()
  })

  test('AC-M07-E2E: Premium upgrade unlocks era 1948 and passport', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    const intent = await createB2cPaymentIntent(request, user.token)
    await confirmB2cPaymentViaWebhook(request, intent, user.token)

    const profile = await unwrap<{ tier: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(user.token) }),
    )
    expect(profile.tier).toBe('PREMIUM')

    await seedSession(page, { ...user, tier: 'PREMIUM' }, { mode: 'online' })

    await gotoTimePortalAndClickEra(page, SEED.cuChiLocationId, '1948')
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toHaveCount(0)

    await page.goto('/profile')
    await page.getByRole('button', { name: /Hộ chiếu & Huy hiệu/i }).click()
    await expect(page.getByRole('heading', { name: /Hộ chiếu Di sản/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/Preview bị khóa — Premium/i)).toHaveCount(0)
  })
})
