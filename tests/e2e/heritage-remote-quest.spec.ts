import { test, expect } from '@playwright/test'
import { BE_URL, SEED } from '../helpers/constants'
import { registerFreshUser, authHeaders, unwrap } from '../helpers/api'
import { completeRemoteQuest, ensureRemoteQuest } from '../helpers/monetization'

test.describe('E2E · Heritage remote quest (AC-5)', () => {
  test('QST-H4: remote quest complete qua discovery không cần GPS', async ({ request }) => {
    const user = await registerFreshUser(request)
    const headers = authHeaders(user.token)
    const remote = await ensureRemoteQuest(request, SEED.benNhaRongLocationId)

    await request.post(`${BE_URL}/api/quests/${remote.id}/start`, { headers })

    const keys = (remote.stepDiscoveryKeys ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    expect(keys.length, 'remote quest must have step discovery keys').toBeGreaterThan(0)

    for (const unlockKey of keys) {
      await request.post(`${BE_URL}/api/me/discoveries`, {
        headers,
        data: { locationId: remote.locationId, unlockKey, source: 'e2e-remote-quest' },
      })
    }

    const progressRes = await request.get(`${BE_URL}/api/quests/${remote.id}/progress`, { headers })
    const progress = await unwrap<{ questId: string; status: string }>(progressRes)
    expect(progress.status).toMatch(/completed|COMPLETED/i)
  })
})
