// src/features/admin/analyticsDemo.ts
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
  completionTrigger?: string | null
  requireOnsiteCheckin?: boolean
  stepsTotal?: number | null
  coverImage?: string | null
  stepDiscoveryKeys?: string | null
}

export type AdminDiscoveryPointInput = {
  locationId: string
  name: string
  unlockKey: string
  mapXPct?: number | null
  mapYPct?: number | null
  sortOrder?: number | null
}

export type AdminArtifactInput = {
  locationId: string
  name: string
  unlockKey: string
  imageUrl?: string | null
  description?: string | null
  reliability?: string | null
  sortOrder?: number | null
}

export type AdminQuestInput = {
  locationId: string
  title: string
  description?: string | null
  story?: string | null
  pointsReward?: number | null
  requiredOrder?: number | null
  completionTrigger?: string | null
  requireOnsiteCheckin?: boolean | null
  stepsTotal?: number | null
  coverImage?: string | null
  stepDiscoveryKeys?: string | null
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

export type SessionReplayStep = {
  poiName: string
  unlockKey: string
  eventType: string
  at: string
  source: string
}

export type SessionReplay = {
  sessionId: string
  userId: string
  locationId: string
  mode: string
  startedAt: string
  endedAt: string | null
  steps: SessionReplayStep[]
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
  updateRole: (userId: string, role: 'USER' | 'ORG_MEMBER' | 'TEACHER' | 'ADMIN') =>
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

  createDiscoveryPoint: (body: AdminDiscoveryPointInput) =>
    getData<AdminDiscoveryPoint>(httpClient.post('/api/admin/discovery-points', body)),
  updateDiscoveryPoint: (id: string, body: AdminDiscoveryPointInput) =>
    getData<AdminDiscoveryPoint>(httpClient.patch(`/api/admin/discovery-points/${id}`, body)),

  createArtifact: (body: AdminArtifactInput) =>
    getData<AdminArtifact>(httpClient.post('/api/admin/artifacts', body)),
  updateArtifact: (id: string, body: AdminArtifactInput) =>
    getData<AdminArtifact>(httpClient.patch(`/api/admin/artifacts/${id}`, body)),

  createQuest: (body: AdminQuestInput) =>
    getData<AdminQuest>(httpClient.post('/api/admin/quests', body)),
  updateQuest: (id: string, body: AdminQuestInput) =>
    getData<AdminQuest>(httpClient.patch(`/api/admin/quests/${id}`, body)),

  analyticsOverview: (locationId: string) =>
    getData<AdminAnalyticsOverview>(
      httpClient.get('/api/admin/analytics/overview', { params: { locationId } }),
    ),

  sessionReplay: (sessionId: string) =>
    getData<SessionReplay>(httpClient.get(`/api/admin/analytics/sessions/${sessionId}/replay`)),

  organizationAnalytics: (orgId: string) =>
    getData<OrganizationAnalytics>(httpClient.get(`/api/admin/organizations/${orgId}/analytics`)),

  eraCount: (locationId: string) =>
    getData<{ eraCount: number; sufficient: boolean }>(
      httpClient.get(`/api/admin/locations/${locationId}/era-count`),
    ),
}

export type { PageResponse }
