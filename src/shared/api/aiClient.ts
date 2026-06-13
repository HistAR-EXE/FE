import axios from 'axios'
import { appEnv } from '../config/env'

function resolveAiBaseUrl(): string {
  if (appEnv.aiUrl) return appEnv.aiUrl.replace(/\/$/, '')
  return ''
}

export const aiClient = axios.create({
  baseURL: resolveAiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
})

export type AiChatPayload = {
  message: string
  persona_key?: string | null
  persona_override?: Record<string, string> | null
  knowledge_context?: string
  sources?: string
  location_id?: string | null
  history?: { role: string; content: string }[]
  player_context?: Record<string, unknown>
}

export type AiChatReply = { reply: string }

export async function generateAiReply(payload: AiChatPayload): Promise<AiChatReply> {
  const res = await aiClient.post<AiChatReply>('/ai/chat', payload)
  return res.data
}

export type AiStreamEvent =
  | { token: string }
  | { done: true; reply: string }
  | { error: string }

function resolveStreamUrl(): string {
  const base = resolveAiBaseUrl()
  return base ? `${base}/ai/chat/stream` : '/ai/chat/stream'
}

/** Stream tokens from POST /ai/chat/stream; falls back to non-stream on failure. */
export async function generateAiReplyStream(
  payload: AiChatPayload,
  onToken: (token: string, partial: string) => void,
): Promise<AiChatReply> {
  const res = await fetch(resolveStreamUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok || !res.body) {
    return generateAiReply(payload)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let partial = ''
  let fullReply = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue
      let evt: AiStreamEvent
      try {
        evt = JSON.parse(raw) as AiStreamEvent
      } catch {
        continue
      }
      if ('error' in evt && evt.error) {
        throw new Error(evt.error)
      }
      if ('token' in evt && evt.token) {
        partial += evt.token
        onToken(evt.token, partial)
      }
      if ('done' in evt && evt.done) {
        fullReply = evt.reply
      }
    }
  }

  if (!fullReply) {
    return generateAiReply(payload)
  }
  return { reply: fullReply }
}

export async function checkAiHealth(): Promise<boolean> {
  try {
    const res = await aiClient.get<{ status: string }>('/ai/health')
    return res.data?.status === 'UP'
  } catch {
    return false
  }
}

/** Tách câu tiếng Việt (theo . ? ! hoặc xuống dòng), bỏ dòng Nguồn. */
export function splitSentencesVi(text: string): string[] {
  const body = text.replace(/\n\s*Nguồn:[\s\S]*/i, '').trim()
  if (!body) return []
  return body
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export async function synthesizeSpeechSentence(
  sentence: string,
  personaKey?: string | null,
): Promise<Blob> {
  const res = await aiClient.post<Blob>(
    '/ai/voice/tts',
    { text: sentence, persona_key: personaKey ?? undefined },
    { responseType: 'blob', timeout: 120_000 },
  )
  return res.data
}

function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Audio playback failed'))
    }
    void audio.play().catch(reject)
  })
}

/** Stream LLM reply; TTS + play từng câu ngay khi đủ dấu kết thúc. */
export async function voiceReplyWithSentenceTts(
  payload: AiChatPayload,
  onPartial: (partial: string) => void,
  onFirstAudio?: () => void,
): Promise<AiChatReply> {
  let scannedLen = 0
  let firstAudio = false
  let chain = Promise.resolve()

  const enqueueSentence = (sentence: string) => {
    const trimmed = sentence.trim()
    if (!trimmed) return
    chain = chain.then(async () => {
      const blob = await synthesizeSpeechSentence(trimmed, payload.persona_key)
      if (!firstAudio) {
        firstAudio = true
        onFirstAudio?.()
      }
      await playAudioBlob(blob)
    })
  }

  const scanCompleteSentences = (partial: string) => {
    const body = partial.split(/\n\s*Nguồn:/i)[0] ?? partial
    const delta = body.slice(scannedLen)
    if (!delta) return
    const re = /[^.!?…]+[.!?…]\s*/g
    let match: RegExpExecArray | null
    let consumed = 0
    while ((match = re.exec(delta)) !== null) {
      enqueueSentence(match[0])
      consumed = match.index + match[0].length
    }
    scannedLen += consumed
  }

  const { reply } = await generateAiReplyStream(payload, (_token, partial) => {
    onPartial(partial)
    scanCompleteSentences(partial)
  })

  const body = reply.split(/\n\s*Nguồn:/i)[0] ?? reply
  const tail = body.slice(scannedLen).trim()
  if (tail) {
    enqueueSentence(tail)
  }

  await chain
  return { reply }
}
