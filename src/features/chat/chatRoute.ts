import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'

const SELECTED_LOCATION_KEY = 'timelens_selected_location_id'

export type ChatPersona = 'chi-nam' | 'anh-ba'

export type BuildChatPathOptions = {
    locationId?: string
    persona?: ChatPersona
    prompt?: string
    questPrompt?: string
    questId?: string
    characterId?: string
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
    if (options.persona) params.set('persona', options.persona)
    if (options.prompt) params.set('prompt', options.prompt)
    if (options.questPrompt) params.set('questPrompt', options.questPrompt)
    if (options.questId) params.set('questId', options.questId)

    if (options.characterId) {
        return `/chat/${options.characterId}?${params}`
    }
    return `/chat?${params}`
}
