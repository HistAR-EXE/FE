// src/features/gamification/api.ts
import { getData, getListData, httpClient } from '../../shared/api/httpClient'
import type { CheckinEngagementResponse, RecordDiscoveryResponse } from './engagementTypes'

export type QuestStep = {
    id: string
    stepOrder: number
    unlockKey: string
    title: string
    objective: string
    description?: string
    hint?: string
    actionType: 'artifact' | 'portal' | 'tour' | 'checkin' | 'briefing' | 'dialogue' | 'reveal'
    actionLabel?: string
    xpPartial?: number
    chatPrompt?: string
    portalEra?: number
    previewImage?: string
}

export type Quest = {
    id: string
    locationId: string
    title: string
    description: string
    story?: string | null
    pointsReward: number
    stepsTotal?: number
    unlockLevel?: number
    coverImage?: string | null
    completionTrigger?: string | null
    requireOnsiteCheckin?: boolean
    steps?: QuestStep[] // Mới
}

export type QuestProgress = {
    questId: string
    locationId: string
    title: string
    description: string
    story?: string | null
    pointsReward: number
    status: string
    currentStep: number
    stepsTotal: number
    discoveryStepsComplete?: boolean
    hasCheckinAtLocation?: boolean
    completionTrigger?: string | null
    requireOnsiteCheckin?: boolean
    startedAt?: string | null
    completedAt?: string | null
}

export type BadgeEarned = {
    id: string
    name: string
    iconUrl?: string | null
}

export type CheckinResult = CheckinEngagementResponse

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

export type VisitedLocations = {
    visitedLocationIds: string[]
    visitedCount: number
}

export const gamificationApi = {
    quests: (locationId?: string) =>
        getListData<Quest>(
            httpClient.get('/api/quests', {
                params: locationId ? { locationId, size: 50 } : { size: 50 },
            }),
        ),
    questById: async (questId: string) => {
        const all = await getListData<Quest>(httpClient.get('/api/quests', { params: { size: 50 } }))
        return all.find((q) => q.id === questId) ?? null
    },
    myQuests: (locationId?: string) =>
        getListData<QuestProgress>(
            httpClient.get('/api/me/quests', {
                params: locationId ? { locationId, size: 50 } : { size: 50 },
            }),
        ),
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
    visitedLocations: () =>
        getData<VisitedLocations>(httpClient.get('/api/me/discoveries/visited-locations')),
    record: (unlockKey: string, source?: string, locationId?: string) =>
        getData<RecordDiscoveryResponse>(
            httpClient.post('/api/me/discoveries', { unlockKey, source, locationId: locationId || undefined }),
        ),
}