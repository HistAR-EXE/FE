import { getData, httpClient } from '../../shared/api/httpClient'

export type RecommendationItem = {
  unlockKey: string
  poiName: string
  reason: string
  deepLink: string
  triggerType: string
}

export type RecommendationsResponse = {
  locationId: string
  items: RecommendationItem[]
}

export const recommendationsApi = {
  forLocation: (locationId: string, afterUnlockKey?: string) =>
    getData<RecommendationsResponse>(
      httpClient.get('/api/me/recommendations', {
        params: { locationId, afterUnlockKey: afterUnlockKey || undefined },
      }),
    ),
}
