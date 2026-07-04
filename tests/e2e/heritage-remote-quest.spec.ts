import { test, expect } from '@playwright/test'
import { BE_URL } from '../helpers/constants'
import { registerFreshUser, authHeaders, unwrap } from '../helpers/api'

type Quest = {
  id: string
  locationId: string
  requireOnsiteCheckin?: boolean
  stepDiscoveryKeys?: string
}

test.describe('E2E · Heritage remote quest (AC-5)', () => {
  test('QST-H4: remote quest complete qua discovery không cần GPS', async ({ request }) => {
    const user = await registerFreshUser(request)
    const headers = authHeaders(user.token)

    const list = await request.get(`${BE_URL}/api/quests`, { params: { size: 50 } })
    const page = await unwrap<{ items: Quest[] }>(list)
    const remote = page.items.find((q) => q.requireOnsiteCheckin === false && q.stepDiscoveryKeys)
    test.skip(!remote, 'No remote quest with step keys in seed')

    await request.post(`${BE_URL}/api/quests/${remote!.id}/start`, { headers })

    const keys = (remote!.stepDiscoveryKeys ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    test.skip(keys.length === 0, 'Remote quest has no step keys')

    for (const unlockKey of keys) {
      await request.post(`${BE_URL}/api/me/discoveries`, {
        headers,
        data: { locationId: remote!.locationId, unlockKey, source: 'e2e-remote-quest' },
      })
    }

    const progressRes = await request.get(`${BE_URL}/api/quests/${remote!.id}/progress`, { headers })
    const progress = await unwrap<{ questId: string; status: string }>(progressRes)
    expect(progress.status).toMatch(/completed|COMPLETED/i)
  })
})
