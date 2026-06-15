import { getData, getListData, getPageData, httpClient } from '../../shared/api/httpClient'
import type { PageResponse } from '../../shared/api/contracts'
import { appEnv } from '../../shared/config/env'
import {
  checkAiHealth,
  generateAiReply,
  generateAiReplyStream,
  type AiChatPayload,
} from '../../shared/api/aiClient'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export type ChatReply = {
  reply: string
  conversationId: string
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

export const chatApi = {
  getContext: (characterId: string, conversationId?: string | null) =>
    getData<ChatContext>(
      httpClient.get('/api/chat/context', {
        params: { characterId, ...(conversationId ? { conversationId } : {}) },
      }),
    ),

  sync: (payload: {
    characterId: string
    conversationId?: string | null
    userMessage: string
    assistantReply: string
  }) =>
    getData<ChatReply>(
      httpClient.post('/api/chat/sync', {
        characterId: payload.characterId,
        conversationId: payload.conversationId ?? undefined,
        userMessage: payload.userMessage,
        assistantReply: payload.assistantReply,
      }),
    ),

  sendLegacy: (payload: { characterId: string; message: string; conversationId?: string | null }) =>
    getData<ChatReply>(httpClient.post('/api/chat', payload)),

  getMessages: (conversationId: string, page = 0, size = 50, sort = 'createdAt,asc') =>
    getListData<ChatMessage>(
      httpClient.get(`/api/chat/conversations/${conversationId}/messages`, { params: { page, size, sort } }),
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

  /** context (BE) → generate (AI) → sync (BE); fallback legacy BE chat */
  async send(
    payload: {
      characterId: string
      message: string
      conversationId?: string | null
      onStreamToken?: (partial: string) => void
    },
  ): Promise<ChatReply> {
    if (appEnv.chatOrchestrated) {
      return chatApi.sendOrchestrated(payload)
    }

    if (!appEnv.useDirectAi) {
      return chatApi.sendLegacy(payload)
    }

    const aiUp = await checkAiHealth()
    if (!aiUp) {
      return chatApi.sendLegacy(payload)
    }

    const ctx = await chatApi.getContext(payload.characterId, payload.conversationId)
    const aiPayload: AiChatPayload = {
      message: payload.message,
      persona_key: ctx.personaKey,
      persona_override: Object.keys(ctx.personaOverride ?? {}).length ? ctx.personaOverride : null,
      knowledge_context: ctx.knowledgeContext ?? '',
      sources: ctx.sources ?? '',
      location_id: ctx.locationId,
      history: ctx.history ?? [],
      player_context: ctx.playerContext ?? undefined,
    }

    const { reply } = payload.onStreamToken
      ? await generateAiReplyStream(aiPayload, (_token, partial) => payload.onStreamToken!(partial))
      : await generateAiReply(aiPayload)

    const syncPayload = {
      characterId: payload.characterId,
      conversationId: ctx.conversationId ?? payload.conversationId,
      userMessage: payload.message,
      assistantReply: reply,
    }
    try {
      return await chatApi.sync(syncPayload)
    } catch {
      return await chatApi.sync(syncPayload)
    }
  },
}
