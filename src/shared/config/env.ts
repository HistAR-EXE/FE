const env = import.meta.env

const apiUrl = env.VITE_API_URL ?? 'http://localhost:8080'
const aiUrl = env.VITE_AI_URL ?? ''
const isProdBuild = env.PROD === true

if (isProdBuild && /localhost|127\.0\.0\.1/i.test(apiUrl)) {
  console.warn(
    '[TimeLens] VITE_API_URL trỏ localhost trong build production. Đặt URL HTTPS BE trên Vercel trước khi demo.',
  )
}

export const appEnv = {
  apiUrl: apiUrl || '',
  aiUrl: aiUrl || '',
  /** Dev: empty aiUrl → Vite proxy /ai → localhost:8100 */
  useDirectAi: env.VITE_USE_DIRECT_AI !== 'false',
  /** BE-orchestrated POST /api/chat/messages. Default false — set VITE_CHAT_ORCHESTRATED=true when RAG AI stable. */
  chatOrchestrated: env.VITE_CHAT_ORCHESTRATED === 'true',
  isProdBuild,
  demoEnabled: env.VITE_DEMO_ENABLED === 'true',
  demoMode: env.VITE_DEMO_MODE === 'true',
  demoSecret: env.VITE_DEMO_SECRET ?? '',
  /** Panorama discovery dwell gate (ms). 0 = off (pitch default). Set 3000 post-pitch. */
  discoveryDwellMs: Number(env.VITE_DISCOVERY_DWELL_MS ?? 0),
} as const
