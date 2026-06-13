import { discoveriesApi } from './api'
import { readAppMode } from '../../shared/context/AppModeProvider'
import { getToken } from '../../shared/auth/session'

export const DISCOVERY_RECORDED_EVENT = 'histar:discovery-recorded'

/** Cu Chi — canonical discovery resolver (Phase 1, config-driven). */
const CU_CHI_PANORAMAS = {
  entrance: '22222222-2222-2222-2222-222222222222',
  kitchen: '22222222-2222-2222-2222-222222222221',
  meeting: '22222222-2222-2222-2222-222222222223',
} as const

const CONTENT_KEY_TO_CANONICAL: Record<string, string> = {
  'hotspot:kitchen': `scene:${CU_CHI_PANORAMAS.kitchen}`,
  'hotspot:vent': 'hotspot:vent',
}

const SCENE_LINK_BY_CONTENT_REF: Record<string, string> = {
  'meeting-room': CU_CHI_PANORAMAS.meeting,
}

/** Map UI/content unlock key → catalog discovery_points unlock_key. */
export function resolveCanonicalDiscoveryKey(rawKey: string): string {
  return CONTENT_KEY_TO_CANONICAL[rawKey] ?? rawKey
}

/** Map scene hotspot contentRef → VirtualTourPlugin node id (panorama UUID). */
export function resolveSceneLinkNodeId(contentRef: string, panoramaIds: string[]): string {
  const mapped = SCENE_LINK_BY_CONTENT_REF[contentRef]
  if (mapped) return mapped
  if (panoramaIds.includes(contentRef)) return contentRef
  return contentRef
}

export type DiscoverySource =
  | 'map'
  | 'tour_panorama'
  | 'hotspot_info'
  | 'time_portal'
  | 'artifact'

export type DiscoveryRecordedDetail = {
  recordKey: string
  recorded: boolean
  source?: DiscoverySource
}

export type DiscoveryEngagement = Exclude<DiscoverySource, 'map'>

export type DiscoveryBinding = {
  unlockKey: string
  recordKey: string
  engagement: DiscoveryEngagement
  buildHref: (locationId: string) => string
}

const CU_CHI_PHOTO_SCENES = {
  cuaHam: '50000001-0000-4000-8000-000000000001',
  gieng: '50000001-0000-4000-8000-000000000005',
  vent: '50000001-0000-4000-8000-000000000004',
} as const

function timePortalHref(locationId: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString()
  return `/time-portal/${locationId}${search ? `?${search}` : ''}`
}

const CU_CHI_STATIC_BINDINGS: DiscoveryBinding[] = [
  {
    unlockKey: 'era:1948',
    recordKey: 'era:1948',
    engagement: 'time_portal',
    buildHref: (locationId) => timePortalHref(locationId, { era: '1948' }),
  },
  {
    unlockKey: 'era:1968',
    recordKey: 'era:1968',
    engagement: 'time_portal',
    buildHref: (locationId) => timePortalHref(locationId, { era: '1968' }),
  },
  {
    unlockKey: 'era:2026',
    recordKey: 'era:2026',
    engagement: 'time_portal',
    buildHref: (locationId) => timePortalHref(locationId, { era: '2026' }),
  },
  {
    unlockKey: 'photo:cua-ham',
    recordKey: 'photo:cua-ham',
    engagement: 'time_portal',
    buildHref: (locationId) =>
      timePortalHref(locationId, {
        discoverKey: 'photo:cua-ham',
        scene: CU_CHI_PHOTO_SCENES.cuaHam,
      }),
  },
  {
    unlockKey: 'photo:gieng',
    recordKey: 'photo:gieng',
    engagement: 'time_portal',
    buildHref: (locationId) =>
      timePortalHref(locationId, {
        discoverKey: 'photo:gieng',
        scene: CU_CHI_PHOTO_SCENES.gieng,
      }),
  },
  {
    unlockKey: 'hotspot:vent',
    recordKey: 'hotspot:vent',
    engagement: 'time_portal',
    buildHref: (locationId) =>
      timePortalHref(locationId, {
        discoverKey: 'hotspot:vent',
        scene: CU_CHI_PHOTO_SCENES.vent,
      }),
  },
]

function bindingForUnlockKey(unlockKey: string): DiscoveryBinding {
  const staticMatch = CU_CHI_STATIC_BINDINGS.find((b) => b.unlockKey === unlockKey)
  if (staticMatch) return staticMatch

  if (unlockKey.startsWith('scene:')) {
    const panoramaId = unlockKey.slice('scene:'.length)
    return {
      unlockKey,
      recordKey: unlockKey,
      engagement: 'tour_panorama',
      buildHref: (locationId) =>
        `/tour/360/${locationId}?panorama=${encodeURIComponent(panoramaId)}`,
    }
  }

  if (unlockKey.startsWith('era:')) {
    const era = unlockKey.slice('era:'.length)
    return {
      unlockKey,
      recordKey: unlockKey,
      engagement: 'time_portal',
      buildHref: (locationId) => timePortalHref(locationId, { era }),
    }
  }

  if (unlockKey.startsWith('artifact:')) {
    return {
      unlockKey,
      recordKey: unlockKey,
      engagement: 'artifact',
      buildHref: () => `/artifacts?discoverKey=${encodeURIComponent(unlockKey)}`,
    }
  }

  if (unlockKey.startsWith('photo:') || unlockKey.startsWith('hotspot:')) {
    return {
      unlockKey,
      recordKey: unlockKey,
      engagement: 'time_portal',
      buildHref: (locationId) =>
        timePortalHref(locationId, { discoverKey: unlockKey }),
    }
  }

  return {
    unlockKey,
    recordKey: unlockKey,
    engagement: 'time_portal',
    buildHref: (locationId) => `/explore/${locationId}`,
  }
}

export function getDiscoveryBinding(unlockKey: string): DiscoveryBinding {
  return bindingForUnlockKey(unlockKey)
}

export function discoveryDeepLink(locationId: string, unlockKey: string): string {
  return getDiscoveryBinding(unlockKey).buildHref(locationId)
}

export type RecordDiscoveryOptions = {
  /** Raw unlock key from UI/BE; resolved to canonical before POST. */
  recordKey: string
  locationId?: string
  source?: DiscoverySource
  onSuccess?: (recorded: boolean) => void
  onError?: (error: unknown) => void
}

export function dispatchDiscoveryRecorded(
  recordKey: string,
  recorded: boolean,
  source?: DiscoverySource,
): void {
  const detail: DiscoveryRecordedDetail = { recordKey, recorded, source }
  window.dispatchEvent(new CustomEvent(DISCOVERY_RECORDED_EVENT, { detail }))
  if (import.meta.env.DEV && source) {
    console.debug('[discovery]', detail)
  }
}

/** Records discovery after meaningful engagement; online + authenticated only. */
export async function recordDiscoveryEngagement({
  recordKey: rawKey,
  locationId,
  source,
  onSuccess,
  onError,
}: RecordDiscoveryOptions): Promise<boolean | null> {
  if (!rawKey) return null
  if (readAppMode() !== 'online') return null
  if (!getToken()) return null

  const canonicalKey = resolveCanonicalDiscoveryKey(rawKey)

  try {
    const recorded = await discoveriesApi.record(canonicalKey, source, locationId)
    dispatchDiscoveryRecorded(canonicalKey, recorded, source)
    onSuccess?.(recorded)
    return recorded
  } catch (error) {
    onError?.(error)
    return null
  }
}

/** Map era number to discovery POI key when present in catalog. */
export function eraDiscoveryKey(era: number): string | null {
  if (era === 1948 || era === 1968 || era === 2026) {
    return `era:${era}`
  }
  return null
}
