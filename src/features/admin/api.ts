import { getData, getPageData, httpClient } from '../../shared/api/httpClient'
import type { PageResponse } from '../../shared/api/contracts'

export type AdminUserSummary = {
  id: string
  email: string
  displayName: string
  role: 'USER' | 'ADMIN'
  level: number
  totalPoints: number
  createdAt: string
}

export type AdminDiscoveryPoint = {
  id: string
  locationId: string
  name: string
  mapXPct: number | null
  mapYPct: number | null
  unlockKey: string
  sortOrder: number
}

export type AdminArtifact = {
  id: string
  locationId: string
  name: string
  imageUrl: string | null
  description: string | null
  unlockKey: string
  reliability: string | null
  sortOrder: number
}

export type AdminQuest = {
  id: string
  locationId: string
  title: string
  description: string | null
  story: string | null
  pointsReward: number
  requiredOrder: number
}

export type PoiUnlockRateItem = {
  unlockKey: string
  name: string
  unlockCount: number
  unlockRatePct: number
}

export type QuestFunnelItem = {
  questId: string
  title: string
  started: number
  completed: number
  completionRatePct: number
  completionRule?: string
}

export type JourneyDropOffItem = {
  poiName: string
  unlockKey: string
  sessionCount: number
  dropOffPct: number
}

export type PoiHeatmapItem = {
  unlockKey: string
  name: string
  visitCount: number
  unlockCount: number
  avgDwellMs: number | null
  dropOffHotspot: boolean
}

export type OnlineOfflineConversion = {
  usersWithDiscovery: number
  usersWithCheckin: number
  usersDiscoveryThenCheckin: number
  conversionRatePct: number
}

export type SessionQualityMetrics = {
  avgDurationMinutes: number
  avgDiscoveriesPerSession: number
}

export type AdminAnalyticsOverview = {
  locationId: string
  poiUnlockRates: PoiUnlockRateItem[]
  questFunnel: QuestFunnelItem[]
  onlineToOnsite: OnlineOfflineConversion
  journeyDropOff: JourneyDropOffItem[]
  poiHeatmap: PoiHeatmapItem[]
  sessionQuality: SessionQualityMetrics
  questCompletedCount?: number
  journeyNote: string
}

export type OrganizationAnalytics = {
  organizationId: string
  name: string
  orgType: string
  memberCount: number
  completionRatePct: number
  fullTourRatePct: number
  note: string
}

export const adminApi = {
  listUsers: (page = 0, size = 20) =>
    getPageData<AdminUserSummary>(httpClient.get('/api/admin/users', { params: { page, size } })),
  updateRole: (userId: string, role: 'USER' | 'ADMIN') =>
    getData<AdminUserSummary>(httpClient.patch(`/api/admin/users/${userId}/role`, { role })),

  listDiscoveryPoints: (locationId?: string) =>
    getData<AdminDiscoveryPoint[]>(
      httpClient.get('/api/admin/discovery-points', { params: locationId ? { locationId } : {} }),
    ),
  listArtifacts: (locationId?: string) =>
    getData<AdminArtifact[]>(
      httpClient.get('/api/admin/artifacts', { params: locationId ? { locationId } : {} }),
    ),
  listQuests: (locationId?: string) =>
    getData<AdminQuest[]>(httpClient.get('/api/admin/quests', { params: locationId ? { locationId } : {} })),

  analyticsOverview: (locationId: string) =>
    getData<AdminAnalyticsOverview>(
      httpClient.get('/api/admin/analytics/overview', { params: { locationId } }),
    ),

  organizationAnalytics: (orgId: string) =>
    getData<OrganizationAnalytics>(httpClient.get(`/api/admin/organizations/${orgId}/analytics`)),
}

export type { PageResponse }
