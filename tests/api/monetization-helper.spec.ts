import { test, expect, type APIRequestContext } from '@playwright/test'
import { completeRemoteQuest } from '../helpers/monetization'

type MockApiResponse = {
  ok(): boolean
  status(): number
  text(): Promise<string>
}

function okJsonResponse(data: unknown): MockApiResponse {
  const body = JSON.stringify({ success: true, data })
  return {
    ok: () => true,
    status: () => 200,
    text: async () => body,
  }
}

test.describe('BE API · Monetization helpers', () => {
  test('MON-HELPER-B01: completeRemoteQuest fails clearly when quest never completes', async () => {
    let progressPolls = 0
    const request = {
      post: async () => okJsonResponse({}),
      get: async () => {
        progressPolls += 1
        return okJsonResponse({ status: 'in_progress' })
      },
    } as unknown as APIRequestContext

    await expect(
      completeRemoteQuest(request, 'token', {
        id: 'quest-1',
        locationId: 'loc-1',
        stepDiscoveryKeys: 'artifact:test',
      }),
    ).rejects.toThrow(/quest .* did not complete|did not complete/i)
    expect(progressPolls).toBe(20)
  })
})
