import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { authHeaders, unwrap } from '../helpers/api'
import {
  createMicroOrgWithInvite,
  fillOrgCcuSlots,
  joinOrgAndHeartbeat,
} from '../helpers/monetization'
import { seedSession } from '../helpers/session'

test.describe('E2E · CCU limit modal', () => {
  test.describe.configure({ mode: 'serial', timeout: 6 * 60_000 })

  let blockedUser: Awaited<ReturnType<typeof joinOrgAndHeartbeat>>
  let orgId: string

  test.beforeAll(async ({ request }) => {
    test.setTimeout(6 * 60_000)
    const setup = await createMicroOrgWithInvite(request)
    orgId = setup.orgId
    await fillOrgCcuSlots(request, setup, 14)
    blockedUser = await joinOrgAndHeartbeat(request, setup.inviteCode, false)
  })

  test('MON-B05-e2e: CCU exceeded shows CcuLimitModal on heartbeat', async ({ page }) => {
    const profile = await unwrap<{ orgId: string; orgSubscription?: string }>(
      await page.request.get(`${BE_URL}/api/profile/me`, {
        headers: authHeaders(blockedUser.token),
      }),
    )

    await seedSession(page, {
      ...blockedUser,
      orgId: profile.orgId ?? orgId,
      orgSubscription: profile.orgSubscription ?? 'MICRO',
    })

    await page.goto('/explore')
    await expect(page.getByRole('heading', { name: /Đã đầy CCU của gói trường/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('link', { name: /Xem gói B2B/i })).toBeVisible()
  })
})
