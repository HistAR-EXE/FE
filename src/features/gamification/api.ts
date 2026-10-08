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
    actionType: 'artifact' | 'portal' | 'tour' | 'checkin' | 'briefing' | 'dialogue' | 'reveal' | 'minigame'
    minigameId?: string | null
    actionLabel?: string
    xpPartial?: number
    chatPrompt?: string
    portalEra?: number
    previewImage?: string
}

export type QuestRewardType = 'EXPLORE_XP' | 'CHAPTER_REWARD' | 'QUEST_COMPLETION_REWARD'

export type QuestReward = {
    type: QuestRewardType
    xp: number
    triggerKey?: string | null
}

export type QuestRewardSummary = {
    rewards: QuestReward[]
}

export type NarrativeChoice = { code: string; targetNodeCode: string }
export type NarrativeNode = {
    code: string
    type: string
    choices: NarrativeChoice[]
    title?: string | null
    prompt?: string | null
    actionHref?: string | null
    minimumEvidence?: number | null
}
export type NarrativeQuestGraph = { startNodeCode: string; nodes: NarrativeNode[]; evidenceNodeCodes: string[]; outcomeNodeCodes: string[] }
export type NarrativeInvestigation = { questId: string; version: number; graph: NarrativeQuestGraph }

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
    requiredOrder?: number | null
    steps?: QuestStep[] // Mới
    unlockAfterQuestId?: string | null
    unlockDiscoveryKeys?: string | null
    rewardSummary?: QuestRewardSummary
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

/**
 * Legacy: `qrCode` (location QR) + GPS. QR-first: `qrPayload` (`stationCode:timestamp:sig`) + `stationCode`
 * + `presenceMethod: 'QR'`; GPS is optional when the station QR is verified server-side.
 */
export type CheckinRequestBody = {
    locationId: string
    latitude?: number
    longitude?: number
    qrCode?: string
    qrPayload?: string
    stationCode?: string
    presenceMethod?: 'QR' | 'GPS' | 'MANUAL'
    clientUuid?: string
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
    claimChapterBonus: (locationId: string, unlockKey: string) =>
        getData<{ awarded: number; alreadyClaimed: boolean }>(
            httpClient.post('/api/quests/chapter-bonus', null, { params: { locationId, unlockKey } }),
        ),
    progress: (questId: string) =>
        getData<QuestProgress>(httpClient.get(`/api/quests/${questId}/progress`)),
    investigation: (questId: string) => getData<NarrativeInvestigation>(httpClient.get(`/api/quests/${questId}/investigation`)),
    checkin: (body: CheckinRequestBody) =>
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
