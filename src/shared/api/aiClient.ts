// src/shared/api/aiClient.ts
import axios from 'axios'
import { appEnv } from '../config/env'
import { httpClient } from './httpClient'

function resolveAiBaseUrl(): string {
  if (appEnv.aiUrl) return appEnv.aiUrl.replace(/\/$/, '')
  return ''
}

export const aiClient = axios.create({
  baseURL: resolveAiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
})

export async function synthesizeSpeechSentence(
  sentence: string,
  personaKey?: string | null,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await httpClient.post<Blob>(
    '/api/chat/voice/tts',
    { text: sentence, persona_key: personaKey ?? undefined },
    { responseType: 'blob', timeout: 25_000, signal },
  )
  return res.data
}
