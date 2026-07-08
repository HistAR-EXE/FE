import { test, expect } from '@playwright/test'
import { authHeaders, registerFreshUser, unwrap } from '../helpers/api'
import { BE_URL } from '../helpers/constants'
import { seedSession } from '../helpers/session'

test.describe('E2E · Org provision teacher', () => {
  test('ORG-P03: teacher provisions student via dashboard form', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await unwrap(
      await request.post(`${BE_URL}/api/billing/org/subscribe`, {
        headers: authHeaders(teacher.token),
        data: {
          orgName: `E2E Provision ${Date.now()}`,
          planType: 'STANDARD',
          contactEmail: teacher.email,
        },
      }),
    )
    await seedSession(page, { ...teacher, role: 'TEACHER' }, { mode: 'online' })
    const studentEmail = `e2e_provision_${Date.now()}@histar.vn`

    await page.goto('/teacher')
    await expect(page.getByRole('heading', { name: /Mã mời tổ chức/i })).toBeVisible({ timeout: 15_000 })

    const section = page.getByText('Tạo tài khoản học sinh (Sub-account)').locator('..')
    await section.locator('input[type="email"]').fill(studentEmail)
    await section.getByRole('button', { name: /Tạo tài khoản học sinh/i }).click()

    await expect(page.getByText(/Mật khẩu tạm/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(studentEmail)).toBeVisible()
  })
})
