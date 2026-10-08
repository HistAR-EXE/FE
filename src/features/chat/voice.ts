// src/features/chat/voice.ts
import { chatApi, type ChatSource } from './api'
import { spokenChunks, spokenSentences } from './callCopy'
import { aiClient, synthesizeSpeechSentence } from '../../shared/api/aiClient'
import type { AppLocale } from '../../shared/i18n'

export type VoicePhase = 'idle' | 'recording' | 'stt' | 'chat' | 'tts' | 'playing' | 'answered'

export type SpeechEnd = 'played' | 'silent' | 'stopped'

export function speechLocale(locale: string): string {
  switch (locale) {
    case 'en': return 'en-US'
    case 'ko': return 'ko-KR'
    case 'zh-CN': return 'zh-CN'
    default: return 'vi-VN'
  }
}

export function browserVoiceCapabilities() {
  const host = window as Window & { speechSynthesis?: SpeechSynthesis }
  return {
    recognition: speechCtor() !== null,
    synthesis: Boolean(host.speechSynthesis),
  }
}

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
let speakAbort: AbortController | null = null
let releasePlayback: (() => void) | null = null

export function stopActiveSpeech() {
  speechGeneration += 1
  speakAbort?.abort()
  speakAbort = null
  const audio = activeAudio
  const url = activeAudioUrl
  activeAudio = null
  activeAudioUrl = null
  if (audio) {
    audio.onended = null
    audio.onpause = null
    audio.onerror = null
    audio.pause()
    audio.src = ''
  }
  if (url) URL.revokeObjectURL(url)
  releasePlayback?.()
  releasePlayback = null
}

/** Đợi tiếng tắt hẳn rồi mới cho mic mở, tránh thu tiếng vọng. */
export function waitForSpeechToSettle(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 400)
  })
}

function playSpeechBlob(
  blob: Blob,
  generation: number,
  onAudible?: () => void,
): Promise<SpeechEnd> {
  if (generation !== speechGeneration) return Promise.resolve('stopped')
  if (!blob.size) return Promise.resolve('silent')
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl)
  const url = URL.createObjectURL(blob)
  activeAudioUrl = url
  const audio = new Audio(url)
  audio.volume = 1
  activeAudio = audio
  return new Promise((resolve) => {
    let settled = false
    const finish = (end: SpeechEnd) => {
      if (settled) return
      settled = true
      if (releasePlayback === finish) releasePlayback = null
      if (activeAudio === audio) activeAudio = null
      if (activeAudioUrl === url) {
        URL.revokeObjectURL(url)
        activeAudioUrl = null
      }
      resolve(end)
    }
    releasePlayback = () => finish('stopped')
    audio.onplaying = () => {
      if (generation === speechGeneration) onAudible?.()
    }
    audio.onended = () => {
      if (generation === speechGeneration) finish('played')
    }
    audio.onpause = () => {
      if (generation !== speechGeneration) finish('stopped')
    }
    audio.onerror = () => finish('silent')
    audio.play().catch(() => finish('silent'))
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

  const sentences = spokenSentences(chatReply.reply).slice(0, 3)
  for (const sentence of sentences) {
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
export function startDictation(onText: (text: string) => void, locale: AppLocale = 'vi'): { stop: () => void } | null {
  const Ctor = speechCtor()
  if (!Ctor) return null
  const recognition = new Ctor()
  let stopped = false
  recognition.lang = speechLocale(locale)
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
  locale: AppLocale = 'vi',
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
    recognition.lang = speechLocale(locale)
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

export async function speakReply(
  reply: string,
  personaKey?: string | null,
  hooks?: { onAudible?: () => void },
  locale: AppLocale = 'vi',
): Promise<SpeechEnd> {
  const nativeResult = await speakWithBrowser(reply, locale, hooks)
  if (nativeResult !== null) return nativeResult
  void chatApi.recordVoiceFallback()
  const generation = speechGeneration
  const controller = new AbortController()
  speakAbort = controller
  const chunks = spokenChunks(reply)
  let played = false
  const loadChunk = async (text: string): Promise<Blob | null> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (generation !== speechGeneration) return null
      try {
        const next = await synthesizeSpeechSentence(text, personaKey, controller.signal)
        if (next.size > 0) return next
      } catch {
        if (controller.signal.aborted || generation !== speechGeneration) return null
      }
    }
    return null
  }
  try {
    let upcoming = chunks.length > 0 ? loadChunk(chunks[0]) : null
    for (let index = 0; index < chunks.length; index += 1) {
      if (generation !== speechGeneration) return 'stopped'
      const blob = await upcoming
      upcoming = index + 1 < chunks.length ? loadChunk(chunks[index + 1]) : null
      if (generation !== speechGeneration) return 'stopped'
      if (!blob) continue
      const end = await playSpeechBlob(blob, generation, () => {
        played = true
        hooks?.onAudible?.()
      })
      if (end === 'stopped') return 'stopped'
      if (end === 'played') played = true
    }
  } finally {
    if (speakAbort === controller) speakAbort = null
  }
  return played ? 'played' : 'silent'
}

/** Browser TTS is privacy-preserving and available without sending visitor audio to another service. */
function speakWithBrowser(
  reply: string,
  locale: AppLocale,
  hooks?: { onAudible?: () => void },
): Promise<SpeechEnd | null> {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve(null)
  const generation = speechGeneration
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(reply)
    utterance.lang = speechLocale(locale)
    utterance.onstart = () => {
      if (generation === speechGeneration) hooks?.onAudible?.()
    }
    utterance.onend = () => resolve(generation === speechGeneration ? 'played' : 'stopped')
    utterance.onerror = () => resolve(null)
    try {
      window.speechSynthesis.speak(utterance)
    } catch {
      resolve(null)
    }
  })
}

/** Chữ hiện ngay khi đang nói. */
export function startBrowserCaption(onText: (text: string) => void, locale: AppLocale = 'vi'): (() => void) | null {
  const Ctor = speechCtor()
  if (!Ctor) return null
  const recognition = new Ctor()
  recognition.lang = speechLocale(locale)
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
