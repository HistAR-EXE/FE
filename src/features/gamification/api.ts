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
    actionType: 'artifact' | 'portal' | 'tour' | 'checkin' | 'briefing' | 'dialogue' | 'reveal' | 'minigame' | 'xuanay' | 'station'
    minigameId?: string | null
    actionLabel?: string
    xpPartial?: number
    chatPrompt?: string
    portalEra?: number
    previewImage?: string
    /** Bước bắt buộc để hoàn thành nhiệm vụ (nhiệm vụ v2). Thiếu = bắt buộc. */
    required?: boolean
    /** Bước cần Premium — luôn là tùy chọn. */
    premium?: boolean
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
  observationChecklist?: string[]
  sourceIds?: string[]
  factLabel?: string | null
  evidenceKey?: string | null
  linkedMinigameId?: string | null
  rewardXp?: number | null
}
export type NarrativeSource = { sourceId: string; version: string; locale: string; citation: string; url?: string | null; path?: string | null }
export type NarrativeQuestGraph = { startNodeCode: string; nodes: NarrativeNode[]; evidenceNodeCodes: string[]; outcomeNodeCodes: string[]; sources: NarrativeSource[] }
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
    /** ONLINE = làm từ xa, ONSITE = phải có mặt tại di tích (nhiệm vụ v2). */
    track?: 'ONLINE' | 'ONSITE'
    sortOrder?: number
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null
    estimatedMinutes?: number | null
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

export type CheckinHistoryItem = {
    id: string
    locationId: string
    siteCode: string
    stationCode: string
    stationName: string
    checkedInAt: string
    presenceMethod: string
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
    claimChapterBonus: (locationId: string, unlockKey: string, answer: string) =>
        getData<{ awarded: number; alreadyClaimed: boolean }>(
            httpClient.post('/api/quests/chapter-bonus', null, { params: { locationId, unlockKey, answer } }),
        ),
    recordDialogue: (locationId: string, key: string, conversationId: string) =>
        getData<RecordDiscoveryResponse>(httpClient.post('/api/me/discoveries/dialogue', { locationId, key, conversationId })),
    progress: (questId: string) =>
        getData<QuestProgress>(httpClient.get(`/api/quests/${questId}/progress`)),
    investigation: (questId: string) => getData<NarrativeInvestigation>(httpClient.get(`/api/quests/${questId}/investigation`)),
    investigationProgress: (questId: string) => getData<NarrativeProgress>(httpClient.get(`/api/quests/${questId}/investigation/progress`)),
    investigationAction: (questId: string, action: NarrativeActionType, nodeCode: string, investigationVersion: number, observationCode?: string) => getData<NarrativeProgress>(httpClient.post(`/api/quests/${questId}/investigation/actions`, { action, nodeCode, observationCode, investigationVersion })),
    checkin: (body: CheckinRequestBody) =>
        getData<CheckinResult>(httpClient.post('/api/checkins', body)),
    checkinHistory: (locationId: string) =>
        getListData<CheckinHistoryItem>(httpClient.get('/api/checkins/history', { params: { locationId } })),
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

export type NarrativeActionType = 'VISIT_NODE' | 'RECORD_OBSERVATION' | 'COLLECT_EVIDENCE' | 'SELECT_OUTCOME'
export type NarrativeProgress = { investigation: NarrativeInvestigation; progress: { version: number; visitedNodeCodes: string[]; observationCodes: string[]; chatNodeCodes: string[]; evidenceCodes: string[]; selectedOutcome: string | null } }
