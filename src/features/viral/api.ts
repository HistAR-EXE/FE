import { getData, getListData, httpClient } from '../../shared/api/httpClient'

export type PhotoFrame = {
  id: string
  name: string
  imageUrl: string
  era: string
  sortOrder: number
}

export type UserCreation = {
  id: string
  frameId: string
  outputUrl: string
  variant: 'square' | 'story'
  createdAt: string
  shared: boolean
}

export type SharePrefill = {
  caption: string
  hashtags: string[]
}

export type LeaderboardEntry = {
  rank: number
  userId: string
  displayName: string
  avatarUrl: string | null
  totalPoints: number
  currentUser: boolean
}

export type LeaderboardResponse = {
  scope: 'all' | 'city' | 'week'
  city: string | null
  entries: LeaderboardEntry[]
}

export type ShareRecorded = {
  bonusPointsAwarded: number
  totalPoints: number
  shareCaption: string
}

export const viralApi = {
  frames: () => getListData<PhotoFrame>(httpClient.get('/api/photo-frames')),
  uploadCreation: async (input: { file: File; frameId: string; variant: 'square' | 'story' }) => {
    const formData = new FormData()
    formData.append('file', input.file)
    formData.append('frameId', input.frameId)
    formData.append('variant', input.variant)
    return getData<UserCreation>(
      httpClient.post('/api/user-creations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },
  myCreations: () => getListData<UserCreation>(httpClient.get('/api/me/user-creations')),
  sharePrefill: () => getData<SharePrefill>(httpClient.get('/api/share/prefill')),
  recordShare: (creationId: string) =>
    getData<ShareRecorded>(httpClient.post(`/api/user-creations/${creationId}/record-share`)),
  leaderboard: (scope: 'all' | 'city' | 'week', city?: string) =>
    getData<unknown>(httpClient.get('/api/leaderboard', { params: { scope, city } })).then((data) => {
      if (data && typeof data === 'object' && Array.isArray((data as { entries?: unknown }).entries)) {
        return data as LeaderboardResponse
      }
      if (Array.isArray(data)) {
        return { scope, city: city ?? null, entries: data as LeaderboardEntry[] }
      }
      return { scope, city: city ?? null, entries: [] }
    }),
}

