import { appEnv } from '../config/env'

const AI_BASE = appEnv.aiUrl || ''

/** Probe RAG AI service (port 8100) — used for chat offline banner. */
export async function probeRagAiHealth(): Promise<boolean> {
  try {
    const base = AI_BASE || ''
    const healthUrl = base ? `${base}/ai/health` : '/ai/health'
    const health = await fetch(healthUrl, { signal: AbortSignal.timeout(5_000) })
    if (!health.ok) return false
    const chatUrl = base ? `${base}/ai/chat` : '/ai/chat'
    const probe = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping', knowledge_context: 'HistAR health probe' }),
      signal: AbortSignal.timeout(30_000),
    })
    return probe.ok
  } catch {
    return false
  }
}
