import { getData, getListData, httpClient } from '../../shared/api/httpClient'

export type Quest = {
  id: string
  locationId: string
  title: string
  description: string
  pointsReward: number
  stepsTotal?: number
  unlockLevel?: number
  coverImage?: string | null
}

export type QuestProgress = {
  questId: string
  locationId: string
  title: string
  description: string
  pointsReward: number
  status: string
  currentStep: number
  stepsTotal: number
  discoveryStepsComplete?: boolean
  hasCheckinAtLocation?: boolean
  startedAt?: string | null
  completedAt?: string | null
}

export type BadgeEarned = {
  id: string
  name: string
  iconUrl?: string | null
}

export type CheckinResult = {
  success: boolean
  distanceMeters: number
  questsCompleted: string[]
  badgesEarned: BadgeEarned[]
  secretUnlocked: boolean
}

export type SecretStory = {
  locked: boolean
  title: string
  story: string | null
}

export type DiscoveryPoint = {
  id: string
  name: string
  mapXPct: number
  mapYPct: number
  unlockKey: string
  sortOrder: number
}

export type DiscoverySummary = {
  discovered: number
  total: number
  keys: string[]
  version: number
}

export const gamificationApi = {
  quests: (locationId: string) =>
    getListData<Quest>(httpClient.get('/api/quests', { params: { locationId, size: 50 } })),
  myQuests: (locationId: string) =>
    getListData<QuestProgress>(httpClient.get('/api/me/quests', { params: { locationId, size: 50 } })),
  startQuest: (questId: string) =>
    getData<QuestProgress>(httpClient.post(`/api/quests/${questId}/start`)),
  progress: (questId: string) =>
    getData<QuestProgress>(httpClient.get(`/api/quests/${questId}/progress`)),
  checkin: (body: { locationId: string; latitude: number; longitude: number; qrCode: string }) =>
    getData<CheckinResult>(httpClient.post('/api/checkins', body)),
  secretStory: (locationId: string) =>
    getData<SecretStory>(httpClient.get(`/api/locations/${locationId}/secret-story`)),
}

export const discoveriesApi = {
  pointsByLocation: (locationId: string) =>
    getListData<DiscoveryPoint>(httpClient.get(`/api/discovery-points/by-location/${locationId}`)),
  summary: (locationId: string) =>
    getData<DiscoverySummary>(httpClient.get('/api/me/discoveries/summary', { params: { locationId } })),
  record: (unlockKey: string, source?: string, locationId?: string) =>
    getData<boolean>(
      httpClient.post('/api/me/discoveries', { unlockKey, source, locationId: locationId || undefined }),
    ),
}
