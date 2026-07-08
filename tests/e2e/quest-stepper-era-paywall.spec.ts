import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL, SEED } from '../helpers/constants'
import { createStandardOrgTeacher } from '../helpers/monetization'
import { seedSession } from '../helpers/session'

test.describe('E2E · Quest Stepper Era paywall', () => {
  test('QS-PAY-H01: Free user on quest stepper sees Era 1948 conversion modal', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/quests/${SEED.onsiteQuestId}/start`, {
        headers: authHeaders(user.token),
      }),
    )

    await seedSession(page, user, { mode: 'online' })
    await page.goto(`/quests/${SEED.onsiteQuestId}`)
    await expect(page.getByText('Hoàn thành từng chương theo thứ tự — mỗi bước mở khóa phần tiếp theo.')).toBeVisible({ timeout: 15_000 })

    const expand = page.getByRole('button', { name: /Xem tất cả chương/i })
    if (await expand.isVisible().catch(() => false)) {
      await expand.click()
    }

    await page.getByTestId('quest-stepper-era-paywall-cta').first().click()
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era 1948/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Để sau' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Nâng cấp ngay/i })).toBeVisible()
    await page.getByRole('button', { name: 'Để sau' }).click()
    await expect(page.getByRole('heading', { name: /Mở khoá thần tốc Era 1948/i })).toHaveCount(0)
  })

  test('QS-PAY-B01: Premium user does not see stepper era paywall CTA', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/b2c/subscribe`, {
        headers: authHeaders(user.token),
        data: { paymentMethod: 'SEPAY' },
      }),
    )

    await unwrap(
      await request.post(`${BE_URL}/api/quests/${SEED.onsiteQuestId}/start`, {
        headers: authHeaders(user.token),
      }),
    )

    await seedSession(page, { ...user, tier: 'PREMIUM' }, { mode: 'online' })
    await page.goto(`/quests/${SEED.onsiteQuestId}`)
    await expect(page.getByText('Hoàn thành từng chương theo thứ tự — mỗi bước mở khóa phần tiếp theo.')).toBeVisible({ timeout: 15_000 })

    const expand = page.getByRole('button', { name: /Xem tất cả chương/i })
    if (await expand.isVisible().catch(() => false)) {
      await expand.click()
    }

    await expect(page.getByTestId('quest-stepper-era-paywall-cta')).toHaveCount(0)
  })

  test('QS-PAY-B02: Org member does not see stepper era paywall CTA', async ({ page, request }) => {
    const teacher = await createStandardOrgTeacher(request)
    const invite = await unwrap<{ inviteCode: string }>(
      await request.post(`${BE_URL}/api/org/invite`, { headers: authHeaders(teacher.token) }),
    )

    const student = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/org/join`, {
        headers: authHeaders(student.token),
        data: { inviteCode: invite.inviteCode },
      }),
    )

    await unwrap(
      await request.post(`${BE_URL}/api/quests/${SEED.onsiteQuestId}/start`, {
        headers: authHeaders(student.token),
      }),
    )

    await seedSession(page, student, { mode: 'online' })
    await page.goto(`/quests/${SEED.onsiteQuestId}`)
    await expect(page.getByText('Hoàn thành từng chương theo thứ tự — mỗi bước mở khóa phần tiếp theo.')).toBeVisible({ timeout: 15_000 })

    const expand = page.getByRole('button', { name: /Xem tất cả chương/i })
    if (await expand.isVisible().catch(() => false)) {
      await expand.click()
    }

    await expect(page.getByTestId('quest-stepper-era-paywall-cta')).toHaveCount(0)
  })
})
