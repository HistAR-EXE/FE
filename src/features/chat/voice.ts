import { aiClient } from '../../shared/api/aiClient'
import type { AiChatPayload } from '../../shared/api/aiClient'
import { chatApi } from './api'

export type VoicePhase = 'idle' | 'recording' | 'stt' | 'chat' | 'tts' | 'playing'

export async function transcribeAudio(blob: Blob, filename = 'recording.webm'): Promise<string> {
  const form = new FormData()
  form.append('file', blob, filename)
  const res = await aiClient.post<{ text: string }>('/ai/voice/stt', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  })
  return res.data.text
}

export async function synthesizeSpeech(text: string, personaKey?: string | null): Promise<Blob> {
  const res = await aiClient.post<Blob>(
    '/ai/voice/tts',
    { text, persona_key: personaKey ?? undefined },
    { responseType: 'blob', timeout: 120_000 },
  )
  return res.data
}

export async function voiceChatTurn(payload: {
  audio: Blob
  characterId: string
  conversationId?: string | null
}): Promise<{ userText: string; reply: string; conversationId: string; audioUrl?: string }> {
  const ctx = await chatApi.getContext(payload.characterId, payload.conversationId)

  const form = new FormData()
  form.append('file', payload.audio, 'recording.webm')
  if (ctx.personaKey) form.append('persona_key', ctx.personaKey)
  if (ctx.knowledgeContext) form.append('knowledge_context', ctx.knowledgeContext)
  if (ctx.sources) form.append('sources', ctx.sources)
  if (ctx.locationId) form.append('location_id', ctx.locationId)
  if (ctx.history?.length) form.append('history', JSON.stringify(ctx.history))

  const res = await aiClient.post<{ text: string; reply: string; audio_base64: string | null }>(
    '/ai/voice/chat',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180_000 },
  )

  const syncPayload = {
    characterId: payload.characterId,
    conversationId: ctx.conversationId ?? payload.conversationId,
    userMessage: res.data.text,
    assistantReply: res.data.reply,
  }
  let synced
  try {
    synced = await chatApi.sync(syncPayload)
  } catch {
    synced = await chatApi.sync(syncPayload)
  }

  let audioUrl: string | undefined
  if (res.data.audio_base64) {
    const binary = atob(res.data.audio_base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
  }

  return {
    userText: res.data.text,
    reply: res.data.reply,
    conversationId: synced.conversationId,
    audioUrl,
  }
}

export type VoiceStepwiseOptions = {
  onPartialReply?: (partial: string) => void
  onFirstAudio?: () => void
}

/** STT → stream chat → sentence TTS queue (TTFA thấp) */
export async function voiceChatStepwise(
  payload: {
    audio: Blob
    characterId: string
    conversationId?: string | null
    aiPayload: AiChatPayload
  },
  options?: VoiceStepwiseOptions,
): Promise<{ userText: string; reply: string; conversationId: string; audioUrl?: string }> {
  const userText = await transcribeAudio(payload.audio)
  const ctx = await chatApi.getContext(payload.characterId, payload.conversationId)
  const aiPayload: AiChatPayload = {
    ...payload.aiPayload,
    message: userText,
    persona_key: ctx.personaKey,
    knowledge_context: ctx.knowledgeContext ?? '',
    sources: ctx.sources ?? '',
    location_id: ctx.locationId,
    history: ctx.history ?? [],
  }

  const { voiceReplyWithSentenceTts } = await import('../../shared/api/aiClient')
  const { reply } = await voiceReplyWithSentenceTts(
    aiPayload,
    (partial) => options?.onPartialReply?.(partial),
    options?.onFirstAudio,
  )

  const synced = await chatApi.sync({
    characterId: payload.characterId,
    conversationId: ctx.conversationId ?? payload.conversationId,
    userMessage: userText,
    assistantReply: reply,
  })

  return { userText, reply, conversationId: synced.conversationId }
}

export async function recordOnce(maxMs = 30_000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream)
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop()
    }, maxMs)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onerror = () => {
      window.clearTimeout(timer)
      stream.getTracks().forEach((t) => t.stop())
      reject(new Error('Ghi âm thất bại'))
    }
    recorder.onstop = () => {
      window.clearTimeout(timer)
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
    }
    recorder.start()
  })
}

export function stopActiveRecorder(recorder: MediaRecorder | null) {
  if (recorder && recorder.state === 'recording') recorder.stop()
}
