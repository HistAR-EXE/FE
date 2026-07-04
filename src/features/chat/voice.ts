import { chatApi, type ChatSource } from './api'
import { aiClient, synthesizeSpeechSentence } from '../../shared/api/aiClient'

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

export type VoiceStepwiseOptions = {
  onPartialReply?: (partial: string) => void
  onFirstAudio?: () => void
}

/** STT → orchestrated chat → sentence TTS */
export async function voiceChatStepwise(
  payload: {
    audio: Blob
    characterId: string
    conversationId?: string | null
  },
  options?: VoiceStepwiseOptions,
): Promise<{ userText: string; reply: string; conversationId: string; sources?: ChatSource[] }> {
  const userText = await transcribeAudio(payload.audio)
  options?.onPartialReply?.(userText)

  const chatReply = await chatApi.send({
    characterId: payload.characterId,
    message: userText,
    conversationId: payload.conversationId,
  })
  options?.onPartialReply?.(chatReply.reply)

  const sentences = chatReply.reply.split(/(?<=[.!?…])\s+/).filter(Boolean)
  for (const sentence of sentences.slice(0, 3)) {
    try {
      await synthesizeSpeechSentence(sentence)
      options?.onFirstAudio?.()
    } catch {
      break
    }
  }

  return {
    userText,
    reply: chatReply.reply,
    conversationId: chatReply.conversationId,
    sources: chatReply.sources,
  }
}

export function stopActiveRecorder(recorder: MediaRecorder | null) {
  if (recorder && recorder.state === 'recording') recorder.stop()
}
