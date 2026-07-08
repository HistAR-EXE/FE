import { test, expect } from '@playwright/test'
import {
  createMicroOrgWithInvite,
  fillOrgCcuSlots,
  joinOrgAndHeartbeat,
} from '../helpers/monetization'

test.describe('BE API · CCU heartbeat', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(5 * 60_000)

  test('MON-B05-api: 16th org member gets CCU_LIMIT_EXCEEDED', async ({ request }) => {
    const setup = await createMicroOrgWithInvite(request)
    await fillOrgCcuSlots(request, setup, 14)
    await joinOrgAndHeartbeat(request, setup.inviteCode, false)
  })
})
