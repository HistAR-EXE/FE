// src/features/chat/api.ts
import { getData, getListData, getPageData, httpClient } from '../../shared/api/httpClient'
import { ApiError, type ApiErrorPayload, type PageResponse } from '../../shared/api/contracts'
import { getToken } from '../../shared/auth/session'
import { appEnv } from '../../shared/config/env'

export type ChatSource = {
    title: string
    excerpt?: string
    url?: string | null
}

export type ChatQuiz = {
    prompt: string
    options: { id: string; label: string }[]
    correctId: string
    state: 'open' | 'wrong' | 'correct'
}

export type ChatMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: string
    sources?: ChatSource[]
    quiz?: ChatQuiz
}

export type ChatReply = {
    reply: string
    conversationId: string
    sources?: ChatSource[]
}

export type ChatContext = {
    conversationId: string | null
    personaKey: string
    personaOverride: Record<string, string>
    knowledgeContext: string
    sources: string
    locationId: string | null
    history: { role: string; content: string }[]
    playerContext?: Record<string, unknown>
}

export function normalizeChatSources(
    sources?: ChatSource[] | string[] | null,
): ChatSource[] {
    if (!sources?.length) return []
    const first = sources[0]
    if (typeof first === 'string') {
        return (sources as string[]).map((title) => ({ title, excerpt: title }))
    }
    return sources as ChatSource[]
}

export type ChatPrompt = {
    id: string
    persona: string
    chipLabel: string
    questionText: string
    sortOrder: number
}

async function readGuidedSse(
    response: Response,
    onEvent?: (event: GuidedStreamEvent) => void,
): Promise<GuidedChatReply> {
    if (!response.ok) {
        let payload: Partial<ApiErrorPayload> | null = null
        try {
            payload = await response.json() as Partial<ApiErrorPayload>
        } catch {
            // Keep the stable ApiError shape even when a proxy returns an empty error response.
        }
        throw new ApiError({
            message: payload?.message ?? `Guided chat failed (${response.status})`,
            code: payload?.code,
            status: response.status,
            fieldErrors: payload?.fieldErrors,
            upgradeUrl: payload?.upgradeUrl,
            quotaType: payload?.type,
            upgradePackage: payload?.upgradePackage,
        })
    }
    if (!response.body) throw new ApiError({ message: 'Guided chat returned an empty response', status: response.status })
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const result: GuidedChatReply = { conversationId: null, blocks: [], sources: [], suggestions: [], followUpQuestion: null, safetyBlocked: false }
    const apply = (name: GuidedStreamEvent['name'], raw: string) => {
        const data = JSON.parse(raw) as unknown
        onEvent?.({ name, data })
        if (name === 'meta' && data && typeof data === 'object') {
            const meta = data as { conversationId?: string | null; safetyBlocked?: boolean }
            result.conversationId = meta.conversationId ?? null
            result.safetyBlocked = Boolean(meta.safetyBlocked)
        } else if (name === 'delta' && data && typeof data === 'object') {
            result.blocks.push(data as GuidedAnswerBlock)
        } else if (name === 'sources' && Array.isArray(data)) {
            result.sources = data as ChatSource[]
        } else if (name === 'suggestions' && Array.isArray(data)) {
            result.suggestions = data.filter((value): value is string => typeof value === 'string')
        } else if (name === 'complete' && data && typeof data === 'object') {
            result.followUpQuestion = (data as { followUpQuestion?: string | null }).followUpQuestion ?? null
        } else if (name === 'error') {
            const error = data && typeof data === 'object'
                ? data as Partial<ApiErrorPayload> & { status?: number; quotaType?: string; upgradePackage?: string | null }
                : null
            throw new ApiError({
                message: error?.message ?? 'Guided chat stream failed',
                code: error?.code,
                // SSE has already started, so an HTTP status can no longer be sent. The stable error code
                // remains sufficient for callers to distinguish quota, auth, and provider failures.
                status: error?.status ?? 500,
                fieldErrors: error?.fieldErrors,
                upgradeUrl: error?.upgradeUrl,
                quotaType: error?.quotaType ?? error?.type,
                upgradePackage: error?.upgradePackage,
            })
        }
    }
    while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
        // Servlet containers commonly serialize SSE with CRLF line endings, while mocked
        // streams and the browser examples often use LF. Normalize before frame detection
        // so a real `event:error` cannot be silently treated as an empty successful reply.
        buffer = buffer.replace(/\r\n?/g, '\n')
        let separator = buffer.indexOf('\n\n')
        while (separator >= 0) {
            const frame = buffer.slice(0, separator)
            buffer = buffer.slice(separator + 2)
            let eventName = ''
            let payload = ''
            for (const line of frame.split('\n')) {
                if (line.startsWith('event:')) eventName = line.slice(6).trim()
                if (line.startsWith('data:')) payload += line.slice(5).trim()
            }
            if (eventName && payload) apply(eventName as GuidedStreamEvent['name'], payload)
            separator = buffer.indexOf('\n\n')
        }
        if (done) break
    }
    return result
}

export const chatApi = {
    /** Suggested question chips for a station (public endpoint). */
    getStationPrompts: (siteCode: string, stationCode: string, persona = 'chi-nam') =>
        getListData<ChatPrompt>(
            httpClient.get(`/api/sites/${siteCode}/stations/${stationCode}/chat-prompts`, { params: { persona } }),
        ),

    getContext: (characterId: string, conversationId?: string | null) =>
        getData<ChatContext>(
            httpClient.get('/api/chat/context', {
                params: { characterId, ...(conversationId ? { conversationId } : {}) },
            }),
        ),

    getMessagesPage: (conversationId: string, page = 0, size = 20, sort = 'createdAt,desc') =>
        getPageData<ChatMessage>(
            httpClient.get(`/api/chat/conversations/${conversationId}/messages`, { params: { page, size, sort } }),
        ) as Promise<PageResponse<ChatMessage>>,

    sendOrchestrated: (payload: {
        characterId: string
        message: string
        conversationId?: string | null
        /** Optional station (e.g. ST03): scopes pgvector RAG retrieval to that station first. */
        stationCode?: string | null
        /** Pilot site slug — scopes RAG chunks (V35 site_code). */
        siteCode?: string | null
    }) =>
        getData<ChatReply>(
            httpClient.post('/api/chat/messages', {
                characterId: payload.characterId,
                message: payload.message,
                conversationId: payload.conversationId ?? undefined,
                stationCode: payload.stationCode ?? undefined,
                siteCode: payload.siteCode ?? undefined,
            }),
        ),

    /** Production path — orchestrated chat via BE (BR-14). */
    send(payload: {
        characterId: string
        message: string
        conversationId?: string | null
        stationCode?: string | null
        siteCode?: string | null
    }): Promise<ChatReply> {
        return chatApi.sendOrchestrated(payload)
    },

    sendGuidedStream: async (payload: {
        characterId: string
        message: string
        conversationId?: string | null
        stationCode?: string | null
        siteCode?: string | null
        mode?: 'LIGHT_HINT' | 'DEEP_EXPLAIN' | 'KNOWLEDGE_CHECK'
    }, onEvent?: (event: GuidedStreamEvent) => void, signal?: AbortSignal): Promise<GuidedChatReply> => {
        const token = getToken()
        const response = await fetch(`${appEnv.apiUrl || ''}/api/chat/messages/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal,
            body: JSON.stringify({ ...payload, conversationId: payload.conversationId ?? undefined, mode: payload.mode ?? 'LIGHT_HINT' }),
        })
        return readGuidedSse(response, onEvent)
    },
    recordVoiceFallback: () => httpClient.post('/api/chat/telemetry/voice-fallback').catch(() => undefined),
}

export type GuidedConfidence = 'VERIFIED' | 'CAUTION' | 'ROLEPLAY'
export type GuidedAnswerType = 'VERIFIED_FACT' | 'INTERPRETATION' | 'ROLEPLAY'
export type GuidedAnswerBlock = {
    type: GuidedAnswerType
    confidence: GuidedConfidence
    content: string
    sources: ChatSource[]
}
export type GuidedStreamEvent = {
    name: 'meta' | 'delta' | 'sources' | 'suggestions' | 'complete' | 'error'
    data: unknown
}
export type GuidedChatReply = {
    conversationId: string | null
    blocks: GuidedAnswerBlock[]
    sources: ChatSource[]
    suggestions: string[]
    followUpQuestion: string | null
    safetyBlocked: boolean
}
