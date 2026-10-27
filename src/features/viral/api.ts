// src/features/viral/api.ts
import { getData, getListData, httpClient } from '../../shared/api/httpClient'

export type PhotoFrame = {
  id: string
  name: string
  imageUrl: string
  era: string
  sortOrder: number
  requiresPremium?: boolean
}

export type UserCreation = {
  id: string
  frameId: string | null
  outputUrl: string
  variant: 'square' | 'story'
  createdAt: string
  shared: boolean
  kind?: 'original' | 'heritage'
  siteCode?: string | null
  stationCode?: string | null
  roleId?: string | null
  era?: number | null
  source?: string | null
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
  scope: 'all' | 'city' | 'week' | 'school' | 'group'
  city: string | null
  entries: LeaderboardEntry[]
  viewerRankLocked?: boolean
  viewerRank?: number | null
  viewerTotalPoints?: number | null
}

export type ShareRecorded = {
  bonusPointsAwarded: number
  totalPoints: number
  shareCaption: string
}

export const viralApi = {
  frames: () => getListData<PhotoFrame>(httpClient.get('/api/photo-frames')),
  uploadCreation: async (input: { file: File; frameId?: string | null; variant: 'square' | 'story'; kind?: 'original' | 'heritage'; siteCode?: string; stationCode?: string; roleId?: string; era?: number; source?: string }) => {
    const formData = new FormData()
    formData.append('file', input.file)
    if (input.frameId) formData.append('frameId', input.frameId)
    formData.append('variant', input.variant)
    if (input.kind) formData.append('kind', input.kind)
    if (input.siteCode) formData.append('siteCode', input.siteCode)
    if (input.stationCode) formData.append('stationCode', input.stationCode)
    if (input.roleId) formData.append('roleId', input.roleId)
    if (input.era) formData.append('era', String(input.era))
    if (input.source) formData.append('source', input.source)
    return getData<UserCreation>(
      httpClient.post('/api/user-creations', formData, {
        // Remove the JSON default so the browser/Axios can add the multipart
        // boundary automatically.
        headers: { 'Content-Type': undefined },
      }),
    )
  },
  myCreations: () => getListData<UserCreation>(httpClient.get('/api/me/user-creations')),
  deleteCreation: (creationId: string) => httpClient.delete(`/api/user-creations/${encodeURIComponent(creationId)}`).then(() => undefined),
  downloadCreationImage: (creationId: string, signal?: AbortSignal) =>
    httpClient.get<Blob>(`/api/user-creations/${encodeURIComponent(creationId)}/image`, {
      responseType: 'blob',
      signal,
    }).then((response) => response.data),
  sharePrefill: () => getData<SharePrefill>(httpClient.get('/api/share/prefill')),
  recordShare: (creationId: string) =>
    getData<ShareRecorded>(httpClient.post(`/api/user-creations/${creationId}/record-share`)),
  leaderboard: (scope: 'all' | 'city' | 'week' | 'school', city?: string, groupId?: string) =>
    getData<unknown>(httpClient.get('/api/leaderboard', { params: { scope, city, groupId } })).then((data) => {
      if (data && typeof data === 'object' && Array.isArray((data as { entries?: unknown }).entries)) {
        return data as LeaderboardResponse
      }
      if (Array.isArray(data)) {
        return { scope, city: city ?? null, entries: data as LeaderboardEntry[] }
      }
      return { scope, city: city ?? null, entries: [] }
    }),
}
