import { getData, getListData, httpClient } from '../../shared/api/httpClient'

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

export const chatApi = {
  send: (payload: { characterId: string; message: string; conversationId?: string | null }) =>
    getData<ChatReply>(httpClient.post('/api/chat', payload)),
  getMessages: (conversationId: string, page = 0, size = 50, sort = 'createdAt,asc') =>
    getListData<ChatMessage>(httpClient.get(`/api/chat/conversations/${conversationId}/messages`, { params: { page, size, sort } })),
}

