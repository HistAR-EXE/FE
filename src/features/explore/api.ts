import { getData, httpClient } from '../../shared/api/httpClient'
import type { ProfileMe } from '../profile/api'

export type ExploreBadgeProgress = {
  id: string
  earned: boolean
  earnedAt: string | null
  progressPercent: number
  progressText: string
}

export type ExploreSnapshot = {
  profile: ProfileMe
  discovery: { discovered: number; total: number; keys: string[]; version: number }
  archiveXp: number
  badges: ExploreBadgeProgress[]
}

export type ExploreAttemptResponse = {
  passed: boolean
  alreadyCompleted: boolean
  xpEarned: number
  snapshot: ExploreSnapshot
}

export const exploreApi = {
  snapshot: () => getData<ExploreSnapshot>(httpClient.get('/api/me/explore')),
  submit: (locationId: string, key: string, answer?: number) =>
    getData<ExploreAttemptResponse>(httpClient.post('/api/me/explore/attempts', { locationId, key, answer })),
  recordDiorama: (locationId: string) =>
    getData<ExploreSnapshot>(httpClient.post('/api/me/explore/experiences', { locationId, type: 'diorama' })),
}
