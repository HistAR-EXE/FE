// src/features/story/api.ts
import { getListData, httpClient } from '../../shared/api/httpClient'

export type StoryChapter = {
    id: string
    siteCode: string
    chapterNumber: number
    stationCode: string
    title: string
    /** null while the chapter is locked */
    synopsis: string | null
    requiresPremium: boolean
    sortOrder: number
    unlocked: boolean
    /** Station check-in exists for this chapter. */
    completed?: boolean
    /** SEQUENCE = previous chapter not completed; PREMIUM = needs Premium; null when unlocked. */
    lockReason?: 'SEQUENCE' | 'PREMIUM' | null
}

export const storyApi = {
    chapters: (siteCode: string) =>
        getListData<StoryChapter>(httpClient.get(`/api/sites/${encodeURIComponent(siteCode)}/story`)),
}
