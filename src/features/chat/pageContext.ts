import { buildStationPagePath, normalizeStationRouteContext } from '../stations/stationRoutes.ts'

export type FeatureKey =
  | 'OVERVIEW'
  | 'NAVIGATION'
  | 'EXPLORE'
  | 'STATION_MEDIA'
  | 'STATION_CHECKIN'
  | 'QUESTS'
  | 'ARTIFACTS'
  | 'TOUR_360'
  | 'DIORAMA'
  | 'HISTORICAL_REENACTMENT'
  | 'TIME_PORTAL'
  | 'AR'
  | 'PHOTO_MEMORY'
  | 'CHAT_AI'
  | 'OFFLINE_LITE'
  | 'TROUBLESHOOTING'

export type ChatPageContext = {
  featureKey: FeatureKey
  route: string
  siteCode?: string
  stationCode?: string
}

export type ChatLocationLike = {
  pathname: string
  search?: string
}

const SOURCE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  explore: '/explore',
  scan: '/scan',
  quests: '/quests',
  artifacts: '/artifacts',
  'tour-360': '/tour/360',
  diorama: '/diorama',
  'time-portal': '/time-portal',
  ar: '/ar-experience',
  'photo-frame': '/photo-frame',
})

function normalizedPath(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const aliased = SOURCE_ALIASES[trimmed.toLowerCase()] ?? trimmed
  if (!aliased.startsWith('/') || aliased.startsWith('//') || aliased.includes('\\')) return null
  const path = aliased.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/'
  return path.length <= 256 ? path : null
}

function featureForPath(path: string): FeatureKey | null {
  if (path === '/' || path === '/about') return 'OVERVIEW'
  if (path === '/explore') return 'EXPLORE'
  if (path === '/scan') return 'STATION_CHECKIN'
  if (/^\/(?:sites\/[^/]+\/)?stations\/[^/]+\/media$/.test(path)) return 'STATION_MEDIA'
  if (/^\/(?:sites\/[^/]+\/)?stations\/[^/]+\/game\/[^/]+$/.test(path)) return 'QUESTS'
  if (path === '/quests' || path.startsWith('/quests/')) return 'QUESTS'
  if (path === '/artifacts' || path.startsWith('/artifacts/')) return 'ARTIFACTS'
  if (path === '/tour/360' || path.startsWith('/tour/360/')) return 'TOUR_360'
  if (path === '/diorama' || path.startsWith('/diorama/')) return 'DIORAMA'
  if (path.startsWith('/time-portal/')) return 'TIME_PORTAL'
  if (path === '/ar-experience') return 'AR'
  if (path === '/photo-frame' || path === '/share') return 'PHOTO_MEMORY'
  if (path === '/pack-prep') return 'OFFLINE_LITE'
  if (path === '/settings') return 'TROUBLESHOOTING'
  if (path === '/chat' || path.startsWith('/chat/')) return 'CHAT_AI'
  return null
}

function directStationContext(path: string): Pick<ChatPageContext, 'siteCode' | 'stationCode'> | null {
  const match = path.match(/^\/sites\/([^/]+)\/stations\/([^/]+)\/(?:media|game\/[^/]+)$/)
  if (!match) return null
  const siteCode = decodeURIComponent(match[1]).trim().toLowerCase()
  const stationCode = decodeURIComponent(match[2]).trim().toUpperCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(siteCode) || !/^ST\d{2}$/.test(stationCode)) return null
  return { siteCode, stationCode }
}

/** Navigation context only. It never proves that a visitor checked in or is physically present. */
export function buildChatPageContext(
  location: ChatLocationLike,
  params = new URLSearchParams(location.search ?? ''),
): ChatPageContext | null {
  const chatStation = normalizeStationRouteContext({
    siteCode: params.get('site') ?? '',
    stationCode: params.get('station') ?? params.get('stationCode') ?? '',
    locationId: params.get('locationId') ?? '',
  })
  if (chatStation) {
    return {
      featureKey: 'STATION_MEDIA',
      route: buildStationPagePath(chatStation),
      siteCode: chatStation.siteCode,
      stationCode: chatStation.stationCode,
    }
  }

  const currentPath = normalizedPath(location.pathname)
  if (!currentPath) return null
  const sourcePath = currentPath.startsWith('/chat') ? normalizedPath(params.get('from')) : null
  const route = sourcePath && featureForPath(sourcePath) ? sourcePath : currentPath
  const featureKey = featureForPath(route)
  if (!featureKey) return null

  const station = directStationContext(route)
  return { featureKey, route, ...(station ?? {}) }
}

export function pageContextKey(context: ChatPageContext | null): string {
  if (!context) return 'none'
  return [context.featureKey, context.route, context.siteCode ?? '', context.stationCode ?? ''].join(':')
}

