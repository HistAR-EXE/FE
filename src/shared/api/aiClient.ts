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
