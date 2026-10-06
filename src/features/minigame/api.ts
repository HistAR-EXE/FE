import { getData, httpClient } from '../../shared/api/httpClient'

export type MinigameView = {
    id: string
    engine: 'xep_tang' | 'soi_nap' | 'dao_gap' | 'san_co_vat' | 'duong_khoi' | 'im_lang' | 'phong_van'
    title: string
    levelId: string
    view: {
        prompt?: string
        floors?: { id: string; label: string }[]
        items?: { id: string; label: string }[]
        imageUrl?: string
        timeLimitMs?: number
        hotspotCount?: number
        angleMin?: number
        angleMax?: number
        cells?: { id: string; kind: string }[]
        holdMs?: number
        marginRatio?: number
        topics?: { label: string }[]
    }
}

export type MinigameAttemptResult = {
    stars: number
    passed: boolean
    learnFact: string
    learnUrl: string
    discoveryRecorded: boolean
    discoveryXp: number
    attempts: number
    pending?: boolean
}

export type MinigameAttemptBody = {
    levelId: string
    drops?: { itemId: string; floorId: string }[]
    taps?: { x: number; y: number; atMs: number }[]
    angles?: number[]
    durationMs?: number
    count?: number
    quietMs?: number
    baselineRms?: number
    peakRms?: number
    holdMs?: number
    transcript?: string
}

export const minigameApi = {
    open: (id: string) => getData<MinigameView>(httpClient.get(`/api/quests/minigames/${id}`)),
    submit: (id: string, body: MinigameAttemptBody) =>
        getData<MinigameAttemptResult>(httpClient.post(`/api/quests/minigames/${id}/attempts`, body)),
}

export const DEV_MINIGAME_QUEST_ID = '33333333-3333-3333-3333-333333333336'
export const INTERVIEW_MINIGAME_ID = 'a1000001-0000-4000-8000-000000000015'

export function isDevMinigameQuestVisible(questId: string) {
    return questId !== DEV_MINIGAME_QUEST_ID || import.meta.env.DEV
}
