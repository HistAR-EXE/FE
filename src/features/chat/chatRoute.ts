// src/features/chat/chatRoute.ts
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { normalizeChatPersona } from './chatPersona'

const SELECTED_LOCATION_KEY = 'timelens_selected_location_id'

export type { ChatPersona } from './chatPersona'

export type BuildChatPathOptions = {
    locationId?: string
    persona?: string
    prompt?: string
    questPrompt?: string
    questId?: string
    characterId?: string
    autoSend?: boolean
    from?: string
}

export function saveSelectedLocationId(locationId: string) {
    if (!locationId) return
    localStorage.setItem(SELECTED_LOCATION_KEY, locationId)
}

export function readSelectedLocationId(): string | null {
    return localStorage.getItem(SELECTED_LOCATION_KEY)
}

/** URL param → onboarding selection → Củ Chi default (same as Tour 360 / Time Portal). */
export function resolveChatLocationId(urlLocationId?: string | null): string {
    const trimmed = urlLocationId?.trim()
    if (trimmed) return trimmed
    return readSelectedLocationId() ?? CU_CHI_LOCATION_ID
}

export function buildChatPath(options: BuildChatPathOptions = {}): string {
    const locationId = resolveChatLocationId(options.locationId)
    const params = new URLSearchParams({ locationId })
    params.set('persona', normalizeChatPersona(options.persona))
    if (options.prompt) params.set('prompt', options.prompt)
    if (options.questPrompt) params.set('questPrompt', options.questPrompt)
    if (options.questId) params.set('questId', options.questId)
    if (options.autoSend) params.set('autoSend', '1')
    if (options.from) params.set('from', options.from)

    if (options.characterId) {
        return `/chat/${options.characterId}?${params}`
    }
    return `/chat?${params}`
}