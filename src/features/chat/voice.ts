// src/features/chat/voice.ts
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

let activeAudio: HTMLAudioElement | null = null
let activeAudioUrl: string | null = null
let speechGeneration = 0

export function stopActiveSpeech() {
  speechGeneration += 1
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.src = ''
    activeAudio = null
  }
  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl)
    activeAudioUrl = null
  }
}

function playSpeechBlob(blob: Blob, generation: number): Promise<void> {
  if (generation !== speechGeneration) return Promise.resolve()
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl)
  const url = URL.createObjectURL(blob)
  activeAudioUrl = url
  const audio = new Audio(url)
  activeAudio = audio
  return new Promise((resolve, reject) => {
    const finish = () => {
      if (activeAudio === audio) activeAudio = null
      if (activeAudioUrl === url) {
        URL.revokeObjectURL(url)
        activeAudioUrl = null
      }
      resolve()
    }
    audio.onended = finish
    audio.onpause = finish
    audio.onerror = () => reject(new Error('Không phát được giọng đọc'))
    audio.play().catch(reject)
  })
}

/** STT → orchestrated chat → sentence TTS */
export async function voiceChatStepwise(
  payload: {
    audio: Blob
    characterId: string
    conversationId?: string | null
    personaKey?: string | null
  },
  options?: VoiceStepwiseOptions,
): Promise<{ userText: string; reply: string; conversationId: string; sources?: ChatSource[] }> {
  const generation = speechGeneration
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
    if (generation !== speechGeneration) break
    try {
      const blob = await synthesizeSpeechSentence(sentence, payload.personaKey)
      if (generation !== speechGeneration) break
      options?.onFirstAudio?.()
      await playSpeechBlob(blob, generation)
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

type SpeechAlternative = { transcript: string }
type SpeechResult = ArrayLike<SpeechAlternative> & { isFinal: boolean }
type BrowserSpeech = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function speechCtor(): (new () => BrowserSpeech) | null {
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserSpeech
    webkitSpeechRecognition?: new () => BrowserSpeech
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

function transcriptOf(event: { results: ArrayLike<SpeechResult> }) {
  let text = ''
  for (let i = 0; i < event.results.length; i += 1) {
    text += event.results[i][0]?.transcript ?? ''
  }
  return text.trim()
}

/** Điền chữ vào ô nhắn khi đang nói. Không gửi lên server. */
export function startDictation(onText: (text: string) => void): { stop: () => void } | null {
  const Ctor = speechCtor()
  if (!Ctor) return null
  const recognition = new Ctor()
  let stopped = false
  recognition.lang = 'vi-VN'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.onresult = (event) => onText(transcriptOf(event))
  recognition.onerror = () => {
    if (!stopped) {
      stopped = true
    }
  }
  recognition.onend = () => {
    if (stopped) return
    try {
      recognition.start()
    } catch {
      stopped = true
    }
  }
  try {
    recognition.start()
  } catch {
    return null
  }
  return {
    stop: () => {
      stopped = true
      try {
        recognition.stop()
      } catch {
        /* đã dừng */
      }
    },
  }
}

/** Nghe một lượt nói rồi kết thúc khi người nói ngừng. */
export function listenForUtterance(
  onUpdate: (text: string) => void,
  shouldStop: () => boolean,
): Promise<string> {
  const Ctor = speechCtor()
  if (!Ctor) return Promise.reject(new Error('unsupported'))
  return new Promise((resolve, reject) => {
    const recognition = new Ctor()
    let text = ''
    let settled = false
    const finish = (value: string) => {
      if (settled) return
      settled = true
      window.clearInterval(timer)
      resolve(value.trim())
    }
    const timer = window.setInterval(() => {
      if (!shouldStop()) return
      try {
        recognition.stop()
      } catch {
        finish('')
      }
    }, 200)
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      text = transcriptOf(event)
      onUpdate(text)
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        if (!settled) {
          settled = true
          window.clearInterval(timer)
          reject(new Error('not-allowed'))
        }
        return
      }
      finish(text)
    }
    recognition.onend = () => finish(text)
    try {
      recognition.start()
    } catch (error) {
      window.clearInterval(timer)
      reject(error)
    }
  })
}

export async function speakReply(reply: string, personaKey?: string | null, onStart?: () => void) {
  const generation = speechGeneration
  const sentences = reply.split(/(?<=[.!?…])\s+/).filter(Boolean)
  let started = false
  for (const sentence of sentences.slice(0, 3)) {
    if (generation !== speechGeneration) break
    try {
      const blob = await synthesizeSpeechSentence(sentence, personaKey)
      if (generation !== speechGeneration) break
      if (!started) {
        started = true
        onStart?.()
      }
      await playSpeechBlob(blob, generation)
    } catch {
      break
    }
  }
}

/** Chữ hiện ngay khi đang nói. */
export function startBrowserCaption(onText: (text: string) => void): (() => void) | null {
  const Ctor = speechCtor()
  if (!Ctor) return null
  const recognition = new Ctor()
  recognition.lang = 'vi-VN'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.onresult = (event) => {
    let text = ''
    for (let i = 0; i < event.results.length; i += 1) {
      text += event.results[i][0]?.transcript ?? ''
    }
    onText(text.trim())
  }
  try {
    recognition.start()
  } catch {
    return null
  }
  return () => {
    try {
      recognition.stop()
    } catch {
      /* đã dừng */
    }
  }
}
