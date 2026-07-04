import { discoveriesApi } from './api'
import { discoveryBindingsApi, type DiscoveryBindingDto } from './discoveryBindingsApi'
import { readAppMode } from '../../shared/context/AppModeProvider'
import { getToken } from '../../shared/auth/session'
import type { RecordDiscoveryResponse } from './engagementTypes'

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

const bindingCache = new Map<string, DiscoveryBindingDto[]>()

export function resolveCanonicalDiscoveryKey(rawKey: string): string {
  return CONTENT_KEY_TO_CANONICAL[rawKey] ?? rawKey
}

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

export type DiscoveryRecordedDetail = RecordDiscoveryResponse & {
  recordKey: string
  source?: DiscoverySource
}

export type DiscoveryEngagement = Exclude<DiscoverySource, 'map'>

export type DiscoveryBinding = {
  unlockKey: string
  recordKey: string
  engagement: DiscoveryEngagement
  buildHref: (locationId: string) => string
}

function timePortalHref(locationId: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString()
  return `/time-portal/${locationId}${search ? `?${search}` : ''}`
}

function hrefFromTemplate(template: string | undefined, locationId: string, unlockKey: string): string {
  if (!template) {
    return `/explore/${locationId}`
  }
  return template
    .replace('{locationId}', locationId)
    .replace('{unlockKey}', encodeURIComponent(unlockKey))
}

function bindingFromDto(dto: DiscoveryBindingDto): DiscoveryBinding {
  const engagement = (dto.engagement ?? 'time_portal') as DiscoveryEngagement
  return {
    unlockKey: dto.unlockKey,
    recordKey: dto.recordKey || dto.unlockKey,
    engagement,
    buildHref: (locId) => hrefFromTemplate(dto.hrefTemplate, locId, dto.unlockKey),
  }
}

function bindingForUnlockKey(unlockKey: string, locationId?: string): DiscoveryBinding {
  if (locationId) {
    const cached = bindingCache.get(locationId)?.find((b) => b.unlockKey === unlockKey)
    if (cached) {
      return bindingFromDto(cached)
    }
  }

  if (unlockKey.startsWith('scene:')) {
    const panoramaId = unlockKey.slice('scene:'.length)
    return {
      unlockKey,
      recordKey: unlockKey,
      engagement: 'tour_panorama',
      buildHref: (locId) => `/tour/360/${locId}?panorama=${encodeURIComponent(panoramaId)}`,
    }
  }

  if (unlockKey.startsWith('era:')) {
    const era = unlockKey.slice('era:'.length)
    return {
      unlockKey,
      recordKey: unlockKey,
      engagement: 'time_portal',
      buildHref: (locId) => timePortalHref(locId, { era }),
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
      buildHref: (locId) => timePortalHref(locId, { discoverKey: unlockKey }),
    }
  }

  return {
    unlockKey,
    recordKey: unlockKey,
    engagement: 'time_portal',
    buildHref: (locId) => `/explore/${locId}`,
  }
}

export async function preloadDiscoveryBindings(locationId: string): Promise<void> {
  if (!getToken() || bindingCache.has(locationId)) return
  try {
    const bindings = await discoveryBindingsApi.byLocation(locationId)
    bindingCache.set(locationId, bindings)
  } catch {
    bindingCache.set(locationId, [])
  }
}

export function getDiscoveryBinding(unlockKey: string, locationId?: string): DiscoveryBinding {
  return bindingForUnlockKey(unlockKey, locationId)
}

export function discoveryDeepLink(locationId: string, unlockKey: string): string {
  return getDiscoveryBinding(unlockKey, locationId).buildHref(locationId)
}

export type RecordDiscoveryOptions = {
  recordKey: string
  locationId?: string
  source?: DiscoverySource
  onSuccess?: (response: RecordDiscoveryResponse) => void
  onError?: (error: unknown) => void
}

export function dispatchDiscoveryRecorded(detail: DiscoveryRecordedDetail): void {
  window.dispatchEvent(new CustomEvent(DISCOVERY_RECORDED_EVENT, { detail }))
  if (import.meta.env.DEV && detail.source) {
    console.debug('[discovery]', detail)
  }
}

export async function recordDiscoveryEngagement({
  recordKey: rawKey,
  locationId,
  source,
  onSuccess,
  onError,
}: RecordDiscoveryOptions): Promise<RecordDiscoveryResponse | null> {
  if (!rawKey) return null
  if (readAppMode() !== 'online') return null
  if (!getToken()) return null

  const canonicalKey = resolveCanonicalDiscoveryKey(rawKey)

  try {
    const response = await discoveriesApi.record(canonicalKey, source, locationId)
    dispatchDiscoveryRecorded({ ...response, recordKey: canonicalKey, source })
    onSuccess?.(response)
    return response
  } catch (error) {
    onError?.(error)
    return null
  }
}

export function eraDiscoveryKey(era: number): string | null {
  if (era === 1948 || era === 1968 || era === 2026) {
    return `era:${era}`
  }
  return null
}
