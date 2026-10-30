// src/features/chat/voice.ts
import { chatApi, type ChatSource } from './api'
import { spokenChunks, spokenReply, spokenSentences } from './callCopy'
import { aiClient, synthesizeSpeechSentence } from '../../shared/api/aiClient'
import type { AppLocale } from '../../shared/i18n'
import { mouthOpennessAt, readWavEnvelope, type SpeechEnvelope } from './speechEnvelope'

export type VoicePhase = 'idle' | 'recording' | 'stt' | 'chat' | 'tts' | 'playing' | 'answered'

export type SpeechEnd = 'played' | 'silent' | 'stopped' | 'forbidden'

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
let releaseBrowserSpeech: (() => void) | null = null
let playbackAudio: HTMLAudioElement | null = null
let playbackEnvelope: SpeechEnvelope | null = null

/** Read at animation-frame cadence; the HTML audio clock owns synchronization. */
export function getSpeechMouthOpenness(): number {
  if (!activeAudio || activeAudio.paused || activeAudio.ended || activeAudio.muted || activeAudio.volume === 0) return 0
  return mouthOpennessAt(playbackEnvelope, activeAudio.currentTime)
}
const SILENT_AUDIO = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA=='

function getPlaybackAudio(): HTMLAudioElement {
  playbackAudio ??= new Audio()
  playbackAudio.preload = 'auto'
  return playbackAudio
}

/** Call synchronously from the call/replay button to unlock later async audio on mobile. */
export function prepareSpeechPlayback(): void {
  const audio = getPlaybackAudio()
  if (activeAudio) return
  audio.src = SILENT_AUDIO
  void audio.play().then(() => {
    if (audio.src === SILENT_AUDIO && !activeAudio) audio.pause()
  }).catch(() => undefined)
  // Starts loading OS voices on the first interaction; fallback still waits for voiceschanged.
  window.speechSynthesis?.getVoices()
}

export function stopActiveSpeech() {
  playbackEnvelope = null
  speechGeneration += 1
  speakAbort?.abort()
  speakAbort = null
  window.speechSynthesis?.cancel()
  releaseBrowserSpeech?.()
  releaseBrowserSpeech = null
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

async function playSpeechBlob(
  blob: Blob,
  generation: number,
  onAudible?: () => void,
): Promise<SpeechEnd> {
  if (generation !== speechGeneration) return Promise.resolve('stopped')
  if (!blob.size) return Promise.resolve('silent')
  let envelope: SpeechEnvelope | null = null
  try { envelope = readWavEnvelope(await blob.arrayBuffer()) } catch { /* Audio still plays without an envelope. */ }
  if (generation !== speechGeneration) return 'stopped'
  playbackEnvelope = envelope
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl)
  const url = URL.createObjectURL(blob)
  activeAudioUrl = url
  const audio = getPlaybackAudio()
  audio.src = url
  audio.volume = 1
  activeAudio = audio
  return new Promise((resolve) => {
    let settled = false
    const finish = (end: SpeechEnd) => {
      if (settled) return
      settled = true
      window.clearTimeout(watchdog)
      if (releasePlayback === cancelPlayback) releasePlayback = null
      audio.onplaying = null
      audio.onended = null
      audio.onpause = null
      audio.onerror = null
      if (activeAudio === audio) { activeAudio = null; playbackEnvelope = null }
      if (activeAudioUrl === url) {
        URL.revokeObjectURL(url)
        activeAudioUrl = null
      }
      resolve(end)
    }
    const cancelPlayback = () => finish('stopped')
    const watchdog = window.setTimeout(() => { audio.pause(); finish('silent') }, 120_000)
    releasePlayback = cancelPlayback
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

let cancelActiveListening: (() => void) | null = null

export function stopActiveListening(): void {
  cancelActiveListening?.()
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
    const cancel = () => {
      finish('')
      try { recognition.stop() } catch { /* already stopped */ }
    }
    const finish = (value: string) => {
      if (settled) return
      settled = true
      window.clearInterval(timer)
      if (cancelActiveListening === cancel) cancelActiveListening = null
      resolve(value.trim())
    }
    const timer = window.setInterval(() => {
      if (!shouldStop()) return
      finish('')
      try { recognition.stop() } catch { /* already stopped */ }
    }, 200)
    recognition.lang = speechLocale(locale)
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      text = transcriptOf(event)
      if (!settled) onUpdate(text)
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        if (!settled) {
          settled = true
          window.clearInterval(timer)
          if (cancelActiveListening === cancel) cancelActiveListening = null
          reject(new Error('not-allowed'))
        }
        return
      }
      finish(text)
    }
    recognition.onend = () => finish(text)
    cancelActiveListening = cancel
    try {
      recognition.start()
    } catch (error) {
      window.clearInterval(timer)
      if (cancelActiveListening === cancel) cancelActiveListening = null
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
  stopActiveSpeech()
  const generation = speechGeneration
  const controller = new AbortController()
  speakAbort = controller
  const chunks = spokenChunks(reply)
  const targetLocale = speechLocale(locale).startsWith('vi') ? locale : 'vi'
  let played = false
  let serverUnavailable = false
  let accessDenied = false
  const loadChunk = async (text: string): Promise<Blob | null> => {
    if (serverUnavailable || generation !== speechGeneration) return null
    try {
      const blob = await synthesizeSpeechSentence(text, personaKey, controller.signal)
      if (blob.size > 0) return blob
    } catch (error) {
      const status = (error as { status?: number; response?: { status?: number } })?.status
        ?? (error as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) accessDenied = true
      if (!controller.signal.aborted) serverUnavailable = true
    }
    return null
  }
  const audible = () => {
    if (generation !== speechGeneration) return
    played = true
    hooks?.onAudible?.()
  }
  try {
    let upcoming = chunks.length > 0 ? loadChunk(chunks[0]) : null
    for (let index = 0; index < chunks.length; index += 1) {
      if (generation !== speechGeneration) return 'stopped'
      const blob = await upcoming
      if (generation !== speechGeneration) return 'stopped'
      if (accessDenied) return 'forbidden'
      // Fetch the next chunk during playback to avoid a pause between sentences.
      upcoming = index + 1 < chunks.length ? loadChunk(chunks[index + 1]) : null
      let end: SpeechEnd | null = blob ? await playSpeechBlob(blob, generation, audible) : null
      if (end === null || end === 'silent') {
        void chatApi.recordVoiceFallback()
        end = await speakWithBrowser(chunks[index], targetLocale, { onAudible: audible })
      }
      if (end === 'stopped' || generation !== speechGeneration) return 'stopped'
      if (end !== 'played') return 'silent'
      played = true
    }
  } finally {
    if (speakAbort === controller) speakAbort = null
  }
  return played ? 'played' : 'silent'
}

/** Never let an English/Chinese default voice read Vietnamese when OS voices arrive late. */
async function speakWithBrowser(
  reply: string,
  _locale: AppLocale,
  hooks?: { onAudible?: () => void },
): Promise<SpeechEnd | null> {
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return null
  const generation = speechGeneration
  const synthesis = window.speechSynthesis
  const vietnameseVoice = () => synthesis.getVoices().find(v => /^vi(?:-|_)/i.test(v.lang))
  let voice = vietnameseVoice()
  if (!voice) {
    await new Promise<void>(resolve => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        synthesis.removeEventListener('voiceschanged', changed)
        if (releaseBrowserSpeech === finish) releaseBrowserSpeech = null
        resolve()
      }
      const changed = () => { if (vietnameseVoice()) finish() }
      const timer = window.setTimeout(finish, 1500)
      synthesis.addEventListener('voiceschanged', changed)
      releaseBrowserSpeech = finish
      changed()
    })
    if (generation !== speechGeneration) return 'stopped'
    voice = vietnameseVoice()
  }
  if (!voice) return null
  return new Promise(resolve => {
    const utterance = new SpeechSynthesisUtterance(spokenReply(reply))
    utterance.lang = 'vi-VN'
    utterance.voice = voice
    utterance.rate = 1.12
    utterance.pitch = 1.18
    utterance.volume = 1
    let settled = false
    let started = false
    const finish = (end: SpeechEnd | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(startTimer)
      window.clearTimeout(endTimer)
      if (releaseBrowserSpeech === cancel) releaseBrowserSpeech = null
      utterance.onstart = null
      utterance.onend = null
      utterance.onerror = null
      resolve(end)
    }
    const cancel = () => finish('stopped')
    const startTimer = window.setTimeout(() => {
      if (!started) { synthesis.cancel(); finish(null) }
    }, 8000)
    const endTimer = window.setTimeout(() => { synthesis.cancel(); finish(null) }, 120_000)
    releaseBrowserSpeech = cancel
    utterance.onstart = () => {
      if (generation !== speechGeneration) return
      started = true
      window.clearTimeout(startTimer)
      hooks?.onAudible?.()
    }
    utterance.onend = () => finish(generation === speechGeneration ? 'played' : 'stopped')
    utterance.onerror = () => finish(generation === speechGeneration ? null : 'stopped')
    try { synthesis.resume(); synthesis.speak(utterance) } catch { finish(null) }
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
