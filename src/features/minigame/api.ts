import { getData, httpClient } from '../../shared/api/httpClient'

export type MinigameEngine = 'xep_tang' | 'soi_nap' | 'dao_gap' | 'san_co_vat' | 'duong_khoi' | 'im_lang' | 'phong_van'

export type PipeDir = 'N' | 'E' | 'S' | 'W'

/** Ô của Đường khói. Đáp án (rotation) BE đã bỏ đi; "start" là góc ban đầu để vẽ. */
export type PipeCell = {
    id: string
    kind: 'straight' | 'elbow' | 'tee' | 'stove' | 'chamber' | 'outlet' | string
    x?: number
    y?: number
    start?: number
    open?: PipeDir[]
}

export type MinigameView = {
    id: string
    engine: MinigameEngine
    title: string
    levelId: string
    view: {
        prompt?: string
        floors?: { id: string; label: string; depth?: string }[]
        items?: { id: string; label: string }[]
        imageUrl?: string
        revealImageUrl?: string
        timeLimitMs?: number
        hotspotCount?: number
        angleMin?: number
        angleMax?: number
        distanceM?: number
        cols?: number
        rows?: number
        parMs?: number
        cells?: PipeCell[]
        holdMs?: number
        marginRatio?: number
        topics?: { label: string }[]
    }
}

/** Gợi ý khi lượt chơi chưa kết thúc (pending). Không chứa đáp án. */
export type MinigameHint = {
    exposures?: number
    warmth?: 'HOT' | 'WARM' | 'COLD'
    tries?: number
    direction?: 'HIGHER' | 'LOWER'
    near?: boolean
    wrong?: string[]
    mistakes?: number
    mistakesLeft?: number
    wrongCells?: number
    found?: number
    total?: number
    misses?: number
    missesLeft?: number
    lastHit?: boolean
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
    hint?: MinigameHint | null
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

// DEV gate removed — quest visible on prod (V43 seeded properly)
export const INTERVIEW_MINIGAME_ID = 'a1000001-0000-4000-8000-000000000015'

export function isDevMinigameQuestVisible(_questId: string) {
    return true // all quest minigames are visible
}
