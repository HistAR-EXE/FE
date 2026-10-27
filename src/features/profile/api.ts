// src/features/profile/api.ts
import { getData, getListData, getPageData, httpClient } from '../../shared/api/httpClient'
import type { QuestProgress } from '../gamification/api'
import type { OrgSubscription, UserRole, UserTier } from '../../shared/auth/types'

export type ActiveVisitSite = {
  siteCode: string
  expiresAt: string
}

export type ProfileMe = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: UserRole
  tier: UserTier
  orgId: string | null
  orgName: string | null
  orgSubscription: OrgSubscription
  orgRole: string | null
  level: number
  totalPoints: number
  city: string | null
  levelName?: string
  pointsToNextLevel?: number
  levelProgressPercent?: number
  emailVerified?: boolean
  activeVisitSites?: ActiveVisitSite[]
}

export type BadgeCatalogItem = {
  id: string
  name: string
  iconUrl: string | null
}

export type MyBadge = BadgeCatalogItem & {
  earned: boolean
}

export type PassportStamp = {
  locationId: string
  completedAt?: string | null
  arVerified?: boolean
}

export type PassportMe = {
  stamps: PassportStamp[]
}

export type JourneySummary = {
  displayName: string
  level: number
  totalPoints: number
  stationsVisited: number
  totalStations: number
  chaptersCompleted: number
  minigamesPlayed: number
  minigameAvgScore: number
  minigameBestScore: number
  bestMinigameTitle: string | null
  firstCheckinAt: string | null
  lastCheckinAt: string | null
  visitedStationCodes: string[]
  headline: string
}

export type ProfileOverviewStamp = {
  locationId: string
  locationName: string
  siteCode: string | null
  coverImage: string | null
  completedAt: string | null
  arVerified: boolean
}

export type ProfileOverview = {
  profile: ProfileMe
  account: {
    createdAt: string | null
    provider: string | null
    personalTier: string
    organizationPremium: boolean
    organizationStatus: string | null
    organizationExpiresAt: string | null
  }
  stats: {
    completedQuests: number
    discoveredLocations: number
    checkedInLocations: number
    passportStamps: number
    earnedBadges: number
  }
  passportStamps: ProfileOverviewStamp[]
  locations: Array<{ id: string; name: string; siteCode: string | null; coverImage: string | null }>
  generatedAt: string
}

export const profileApi = {
  overview: () => getData<ProfileOverview>(httpClient.get('/api/profile/overview')),
  questsAtLocation: async (locationId: string) => {
    const result: QuestProgress[] = []
    let page = 0, totalPages: number
    do {
      const data = await getPageData<QuestProgress>(httpClient.get('/api/me/quests', { params: { locationId, page, size: 50 } }))
      result.push(...data.items)
      totalPages = data.totalPages
      page++
    } while (page < totalPages)
    return result
  },
  me: () => getData<ProfileMe>(httpClient.get('/api/profile/me')),
  journeySummary: (siteCode = 'cu-chi') =>
    getData<JourneySummary>(
      httpClient.get('/api/profile/journey-summary', { params: { siteCode } }),
    ),
  badgesCatalog: () => getListData<BadgeCatalogItem>(httpClient.get('/api/badges')),
  myBadges: () => getListData<MyBadge>(httpClient.get('/api/me/badges')),
  passport: () => getData<PassportMe>(httpClient.get('/api/me/passport')),
  updateMe: (payload: { displayName?: string; avatarUrl?: string | null; city?: string | null }) =>
    getData<ProfileMe>(httpClient.patch('/api/profile/me', payload)),
  upgrade: () => getData<ProfileMe>(httpClient.post('/api/profile/upgrade')),
}
