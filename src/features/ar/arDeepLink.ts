import { CU_CHI_AR_SCENES, AR_ENABLED_LOCATION_IDS, getArSceneBySceneId } from './cuChiArScenes'
import type { ARMode, CuChiSceneSlug, EraValue } from './types'

export function isArEnabledLocation(locationId: string | undefined | null): boolean {
  return !!locationId && AR_ENABLED_LOCATION_IDS.has(locationId)
}

export type BuildArUrlParams = {
  locationId: string
  mode?: ARMode
  scene?: CuChiSceneSlug
  sceneId?: string
  era?: EraValue
  discoverKey?: string | null
}

export function sceneSlugFromIndex(sceneId: string | undefined, fallbackIndex = 0): CuChiSceneSlug {
  const fromId = sceneId ? getArSceneBySceneId(sceneId)?.slug : undefined
  if (fromId) return fromId
  return CU_CHI_AR_SCENES[fallbackIndex]?.slug ?? 'cua-ham'
}

export function buildArUrl({
  locationId,
  mode = 'sim',
  scene,
  sceneId,
  era = 1968,
  discoverKey,
}: BuildArUrlParams): string {
  const slug = scene ?? sceneSlugFromIndex(sceneId)
  const params = new URLSearchParams()
  params.set('mode', mode)
  params.set('scene', slug)
  params.set('era', String(era))
  if (discoverKey) params.set('discoverKey', discoverKey)
  return `/time-portal/${locationId}/ar?${params.toString()}`
}

export function buildPortalUrl(locationId: string, sceneId?: string, era?: EraValue, discoverKey?: string | null): string {
  const params = new URLSearchParams()
  if (sceneId) params.set('scene', sceneId)
  if (era) params.set('era', String(era))
  if (discoverKey) params.set('discoverKey', discoverKey)
  const q = params.toString()
  return `/time-portal/${locationId}${q ? `?${q}` : ''}`
}

export function defaultArMode(): ARMode {
  if (typeof window === 'undefined') return 'sim'
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const touch = navigator.maxTouchPoints > 0
  if (coarse || touch) return 'live'
  return 'sim'
}

export function parseArMode(raw: string | null): ARMode {
  if (raw === 'webcam' || raw === 'live' || raw === 'sim') return raw
  return defaultArMode()
}

export function parseEra(raw: string | null): EraValue {
  const n = Number(raw)
  if (n === 1948 || n === 1968 || n === 2026) return n
  return 1968
}
