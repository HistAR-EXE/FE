// src/features/profile/api.ts
import { getData, getListData, httpClient } from '../../shared/api/httpClient'

export type ProfileMe = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: 'USER' | 'ADMIN' | 'TEACHER'
  tier: 'FREE' | 'PREMIUM'
  level: number
  totalPoints: number
  city: string | null
  levelName?: string
  pointsToNextLevel?: number
  levelProgressPercent?: number
}

export type BadgeCatalogItem = {
  id: string
  name: string
  iconUrl: string | null
}

export type MyBadge = BadgeCatalogItem & {
  earned: boolean
}

export const profileApi = {
  me: () => getData<ProfileMe>(httpClient.get('/api/profile/me')),
  badgesCatalog: () => getListData<BadgeCatalogItem>(httpClient.get('/api/badges')),
  myBadges: () => getListData<MyBadge>(httpClient.get('/api/me/badges')),
  updateMe: (payload: { displayName?: string; avatarUrl?: string | null; city?: string | null }) =>
    getData<ProfileMe>(httpClient.patch('/api/profile/me', payload)),
  upgrade: () => getData<ProfileMe>(httpClient.post('/api/profile/upgrade')),
}

