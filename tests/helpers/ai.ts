import { type APIRequestContext } from '@playwright/test'

const AI_BASE = process.env.HISTAR_AI_URL ?? 'http://localhost:8100'

/** Health endpoint alone is not enough — RAG/Ollama may still be down. */
export async function isRagAiReady(request: APIRequestContext): Promise<boolean> {
  try {
    const health = await request.get(`${AI_BASE}/ai/health`, { timeout: 5_000 })
    if (!health.ok()) return false
    const probe = await request.post(`${AI_BASE}/ai/chat`, {
      data: { message: 'ping', knowledge_context: 'HistAR smoke probe' },
      timeout: 30_000,
      failOnStatusCode: false,
    })
    return probe.ok()
  } catch {
    return false
  }
}
