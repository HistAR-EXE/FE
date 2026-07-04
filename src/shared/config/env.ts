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
  isProdBuild,
  demoEnabled: env.VITE_DEMO_ENABLED === 'true',
  demoMode: env.VITE_DEMO_MODE === 'true',
  demoSecret: env.VITE_DEMO_SECRET ?? '',
  /** Panorama scene dwell (ms). Spec default 15s. */
  discoveryDwellMs: Number(env.VITE_DISCOVERY_DWELL_MS ?? 15000),
  /** Hotspot info dwell before recording discovery (ms). Spec default 5s. */
  hotspotDwellMs: Number(env.VITE_HOTSPOT_DWELL_MS ?? 5000),
} as const
