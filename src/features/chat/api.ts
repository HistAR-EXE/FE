// src/features/chat/api.ts
import { getData, getPageData, httpClient } from '../../shared/api/httpClient'
import type { PageResponse } from '../../shared/api/contracts'

export type ChatSource = {
    title: string
    excerpt?: string
    url?: string | null
}

export type ChatMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: string
    sources?: ChatSource[]
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

export const chatApi = {
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
    }) =>
        getData<ChatReply>(
            httpClient.post('/api/chat/messages', {
                characterId: payload.characterId,
                message: payload.message,
                conversationId: payload.conversationId ?? undefined,
            }),
        ),

    /** Production path — orchestrated chat via BE (BR-14). */
    send(payload: {
        characterId: string
        message: string
        conversationId?: string | null
    }): Promise<ChatReply> {
        return chatApi.sendOrchestrated(payload)
    },
}