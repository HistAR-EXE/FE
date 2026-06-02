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
  status: 'not_started' | 'in_progress' | 'completed'
  currentStep?: number
  stepsTotal?: number
  startedAt: string | null
  completedAt: string | null
}

export type CheckinResult = {
  success: boolean
  distanceMeters: number
  questsCompleted: string[]
  badgesEarned: { id: string; name: string; iconUrl: string | null }[]
  secretUnlocked: boolean
}

export type SecretStory = {
  locked: boolean
  title: string
  story: string | null
}

export const gamificationApi = {
  quests: (locationId?: string) =>
    getListData<Quest>(httpClient.get('/api/quests', { params: { locationId } })),
  myQuests: (locationId?: string) =>
    getListData<QuestProgress>(httpClient.get('/api/me/quests', { params: { locationId } })),
  startQuest: (questId: string) => getData<QuestProgress>(httpClient.post(`/api/quests/${questId}/start`)),
  progress: (questId: string) => getData<QuestProgress>(httpClient.get(`/api/quests/${questId}/progress`)),
  checkin: (payload: { locationId: string; latitude: number; longitude: number; qrCode: string }) =>
    getData<CheckinResult>(httpClient.post('/api/checkins', payload)),
  secretStory: (locationId: string) =>
    getData<SecretStory>(httpClient.get(`/api/locations/${locationId}/secret-story`)),
}

