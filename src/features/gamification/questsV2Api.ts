// src/features/gamification/questsV2Api.ts
// Nhiệm vụ v2: BE tính trạng thái nhiệm vụ và từng bước, FE chỉ hiển thị.
// Spec: BE/docs/superpowers/specs/2026-10-19-quest-tracks-v2-design.md

import { getData, getListData, httpClient } from '../../shared/api/httpClient'
import type { QuestRewardSummary } from './api'
import type { EngagementOutcome } from './engagementTypes'

export type QuestTrack = 'ONLINE' | 'ONSITE'
export type QuestV2Status = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED'
export type QuestV2StepState = 'DONE' | 'TODO' | 'PREMIUM_LOCKED'
export type QuestDifficulty = 'EASY' | 'MEDIUM' | 'HARD'

export type QuestV2LockKey = { key: string; label: string; done: boolean }
export type QuestV2QuestRef = { id: string; title: string; status: string }

export type QuestV2Lock = {
    reason: 'AFTER_QUEST' | 'DISCOVERY_KEYS' | string
    message: string
    afterQuest: QuestV2QuestRef | null
    keys: QuestV2LockKey[]
}

export type QuestV2Progress = {
    requiredDone: number
    requiredTotal: number
    optionalDone: number
    optionalTotal: number
}

export type QuestV2Card = {
    id: string
    locationId: string
    track: QuestTrack
    title: string
    description: string | null
    story: string | null
    coverImage: string | null
    sortOrder: number
    difficulty: QuestDifficulty | null
    estimatedMinutes: number | null
    pointsReward: number
    status: QuestV2Status
    lock: QuestV2Lock | null
    progress: QuestV2Progress
    nextStepId: string | null
    startedAt: string | null
    completedAt: string | null
}

export type QuestV2ActionType =
    | 'tour'
    | 'portal'
    | 'artifact'
    | 'dialogue'
    | 'minigame'
    | 'xuanay'
    | 'station'
    | 'checkin'
    | 'reveal'
    | 'briefing'
    | 'discovery'

export type QuestV2Step = {
    id: string
    order: number
    key: string
    actionType: QuestV2ActionType | string
    title: string
    objective: string | null
    description: string | null
    hint: string | null
    actionLabel: string | null
    previewImage: string | null
    portalEra: number | null
    minigameId: string | null
    chatPrompt: string | null
    required: boolean
    premium: boolean
    state: QuestV2StepState
    doneAt: string | null
    /** Bước đã xong trước khi nhận nhiệm vụ — vẫn được tính. */
    preDiscovered: boolean
}

export type QuestV2Detail = {
    quest: QuestV2Card
    steps: QuestV2Step[]
    rewardSummary: QuestRewardSummary | null
}

export type QuestCompletedV2 = {
    questId: string
    pointsAwarded: number
    badgesEarned: { id: string; name: string; iconUrl?: string | null }[]
}

export type QuestV2StartResponse = {
    detail: QuestV2Detail
    completed: QuestCompletedV2[]
}

export const questsV2Api = {
    list: (locationId: string, track?: QuestTrack) =>
        getListData<QuestV2Card>(httpClient.get('/api/v2/quests', { params: { locationId, track } })),
    detail: (questId: string) => getData<QuestV2Detail>(httpClient.get(`/api/v2/quests/${questId}`)),
    start: (questId: string) => getData<QuestV2StartResponse>(httpClient.post(`/api/v2/quests/${questId}/start`)),
    /** Hoàn thành các nhiệm vụ đang làm đã đủ bước bắt buộc. Gọi nhiều lần vẫn an toàn. */
    reconcile: (locationId: string) =>
        getListData<QuestCompletedV2>(httpClient.post('/api/v2/me/quests/reconcile', null, { params: { locationId } })),
}

/** Đưa kết quả hoàn thành (start / reconcile) vào màn chúc mừng có sẵn của UserProgressProvider. */
export function completionOutcome(completed: QuestCompletedV2, quest: Pick<QuestV2Card, 'title' | 'locationId' | 'progress'>): EngagementOutcome {
    const total = Math.max(quest.progress.requiredTotal, 1)
    return {
        recorded: true,
        xpEarned: completed.pointsAwarded,
        newArtifacts: [],
        questProgress: {
            questId: completed.questId,
            title: quest.title,
            locationId: quest.locationId,
            stepCompleted: true,
            questCompleted: true,
            currentStep: total,
            stepsTotal: total,
            pointsAwarded: completed.pointsAwarded,
        },
        newlyUnlockedLocations: [],
    }
}

export const TRACK_LABEL: Record<QuestTrack, string> = {
    ONLINE: 'Online',
    ONSITE: 'Tại di tích',
}

export const DIFFICULTY_LABEL: Record<QuestDifficulty, string> = {
    EASY: 'Dễ',
    MEDIUM: 'Vừa',
    HARD: 'Khó',
}

export function trackFromParam(value: string | null | undefined): QuestTrack {
    return (value ?? '').toLowerCase() === 'onsite' ? 'ONSITE' : 'ONLINE'
}

export function trackToParam(track: QuestTrack): string {
    return track === 'ONSITE' ? 'onsite' : 'online'
}
