// src/shared/config/env.ts
const env = import.meta.env

// Dev: để trống → baseURL '' → Vite proxy /api → localhost:8080
// Prod: .env.production hoặc Vercel env → https://histar-postgre.onrender.com
const apiUrl = (env.VITE_API_URL ?? '').trim() || (env.DEV ? '' : '')
const aiUrl = (env.VITE_AI_URL ?? '').trim() || (env.DEV ? '' : '')
const isProdBuild = env.PROD === true

if (isProdBuild && !apiUrl) {
  console.warn(
    '[TimeLens] VITE_API_URL chưa cấu hình. Đặt URL BE trên Vercel (Production env) trước khi demo.',
  )
}

if (isProdBuild && /localhost|127\.0\.0\.1/i.test(apiUrl)) {
  console.warn(
    '[TimeLens] VITE_API_URL trỏ localhost trong build production. Đặt URL HTTPS BE trên Vercel trước khi demo.',
  )
}

const mediaBaseUrl = (env.VITE_MEDIA_BASE_URL ?? '').trim().replace(/\/$/, '')

/**
 * Prefix `/media/...` (and other relative paths) with VITE_MEDIA_BASE_URL when set.
 * When unset, resolve against the current origin so Vercel static hosting stays unchanged.
 * Absolute http(s) URLs are returned as-is.
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  const trimmed = (path ?? '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  if (mediaBaseUrl) return `${mediaBaseUrl}${normalized}`
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${normalized}`
  }
  return normalized
}

export const appEnv = {
  apiUrl: apiUrl || '',
  aiUrl: aiUrl || '',
  mediaBaseUrl,
  isProdBuild,
  demoEnabled: env.VITE_DEMO_ENABLED === 'true',
  demoMode: env.VITE_DEMO_MODE === 'true',
  demoSecret: env.VITE_DEMO_SECRET ?? '',
  /** Panorama scene dwell (ms). Spec default 15s. */
  discoveryDwellMs: Number(env.VITE_DISCOVERY_DWELL_MS ?? 15000),
  /** Hotspot info dwell before recording discovery (ms). Spec default 5s. */
  hotspotDwellMs: Number(env.VITE_HOTSPOT_DWELL_MS ?? 5000),
} as const
