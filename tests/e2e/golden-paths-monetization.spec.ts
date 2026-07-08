import { test, expect } from '@playwright/test'
import { isRagAiReady } from '../helpers/ai'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL, SEED } from '../helpers/constants'
import {
  exhaustFreeDailyChatQuota,
  getCuChiCharacterId,
} from '../helpers/monetization'
import { seedSession } from '../helpers/session'
import { gotoTimePortalAndClickEra } from '../helpers/timePortal'

test.describe('Golden paths · Monetization', () => {
  test.describe.configure({ mode: 'serial' })

  test('GP-MON-01: B2C convert — era lock → pricing → upgrade → unlock', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })

    await gotoTimePortalAndClickEra(page, SEED.cuChiLocationId, '1948')
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toBeVisible()
    await page.getByRole('link', { name: /Nâng cấp ngay|Nâng cấp Premium/i }).click()
    await expect(page).toHaveURL(/\/pricing/)

    await unwrap(
      await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
        headers: authHeaders(user.token),
        data: { paymentMethod: 'DEMO' },
      }),
    )

    await gotoTimePortalAndClickEra(page, SEED.cuChiLocationId, '1948')
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era/i })).toHaveCount(0)
  })

  test('GP-MON-02: B2B school — subscribe → invite → join → era unlock', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    const orgName = `GP B2B ${Date.now()}`
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: { orgName, planType: 'STANDARD', contactEmail: teacher.email },
      }),
    )
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )

    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })
    await page.goto('/teacher')
    await expect(page.getByRole('heading', { name: /Mã mời tổ chức/i })).toBeVisible({
      timeout: 15_000,
    })

    const student = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(student.token),
        data: { inviteCode: invite.inviteCode },
      }),
    )

    const studentProfile = await unwrap<{ orgId: string; orgSubscription?: string }>(
      await request.get(`${BE_URL}/api/profile/me`, { headers: authHeaders(student.token) }),
    )
    await seedSession(page, {
      ...student,
      orgId: studentProfile.orgId,
      orgSubscription: studentProfile.orgSubscription ?? 'STANDARD',
    })
    await gotoTimePortalAndClickEra(page, SEED.cuChiLocationId, '1948')
    await expect(page.getByRole('link', { name: /Nâng cấp ngay|Nâng cấp Premium/i })).toHaveCount(0)
  })

  test('GP-MON-03: Stress quota — 10 msgs API → 11th FE modal → pricing', async ({ page, request }) => {
    test.skip(!(await isRagAiReady(request)), 'RAG AI :8100 unavailable')
    test.setTimeout(15 * 60_000)

    const user = await registerFreshUser(request)
    const characterId = await getCuChiCharacterId(request)
    await exhaustFreeDailyChatQuota(request, user.token, characterId, 10)

    await seedSession(page, user, { mode: 'online' })
    await page.goto(`/chat?locationId=${SEED.cuChiLocationId}&persona=chi-nam`)
    await page.locator('input[placeholder*="Nhắn tin"], input[placeholder*="Nhắn tin cho"]').fill('Tin thứ 11 sau khi cạn quota')
    await page.getByRole('button', { name: 'send', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Hết lượt chat hôm nay/i })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole('button', { name: /Nâng cấp 49/i }).click()
    await expect(page).toHaveURL(/\/pricing/)
  })
})
