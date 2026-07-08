import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('E2E · Classroom Free Trial', () => {
  test('TRIAL-E2E-H01: pricing CTA creates trial and opens teacher dashboard', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await seedSession(page, teacher, { mode: 'online' })
    await page.goto('/pricing#b2b')
    await page.getByRole('button', { name: /Dùng thử lớp học 14 ngày/i }).click()
    await expect(page).toHaveURL(/\/teacher/, { timeout: 20_000 })
    const profile = await unwrap<{ role?: string; orgId?: string | null }>(
      await request.get(`${BE_URL}/api/profile/me`, {
        headers: authHeaders(teacher.token),
      }),
    )
    await seedSession(page, { ...teacher, role: profile.role ?? 'TEACHER', orgId: profile.orgId ?? null }, { mode: 'online' })
    await page.goto('/teacher')
    await expect(page.getByRole('heading', { name: /Dashboard lớp học/i })).toBeVisible({ timeout: 15_000 })

    const status = await unwrap<{ planType: string; maxVerifiedAccounts: number; daysUntilExpiry: number }>(
      await request.get(`${BE_URL}/api/billing/org/status`, {
        headers: authHeaders(teacher.token),
      }),
    )
    expect(status.planType).toBe('STANDARD')
    expect(status.maxVerifiedAccounts).toBe(11)
    expect(status.daysUntilExpiry).toBeLessThanOrEqual(14)
  })
})
