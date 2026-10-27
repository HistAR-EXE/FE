export type StationRouteContext = {
  siteCode: string
  stationCode: string
  locationId: string
}

export type HeritageEntrySource = 'station' | 'time-portal-3d' | 'battle-diorama'

const HERITAGE_ENTRY_SOURCES = new Set<HeritageEntrySource>(['station', 'time-portal-3d', 'battle-diorama'])

export function readHeritageEntrySource(value: string | null | undefined): HeritageEntrySource {
  const normalized = value?.trim().toLowerCase() as HeritageEntrySource | undefined
  return normalized && HERITAGE_ENTRY_SOURCES.has(normalized) ? normalized : 'station'
}

export function appendHeritageEntrySource(path: string, source: HeritageEntrySource): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${new URLSearchParams({ source })}`
}

export function buildDioramaReturnPath(locationId: string): string {
  return UUID.test(locationId.trim()) ? `/diorama/${encodeURIComponent(locationId.trim())}` : '/diorama'
}

const SITE_CODE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const STATION_CODE = /^ST\d{2}$/
// Existing deterministic seed ids are UUID-shaped but do not all encode RFC version/variant bits.
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export function normalizeStationRouteContext(input: StationRouteContext): StationRouteContext | null {
  const siteCode = input.siteCode.trim().toLowerCase()
  const stationCode = input.stationCode.trim().toUpperCase()
  const locationId = input.locationId.trim()
  if (!SITE_CODE.test(siteCode) || !STATION_CODE.test(stationCode) || !UUID.test(locationId)) return null
  return { siteCode, stationCode, locationId }
}

export function readStationRouteContext(params: URLSearchParams): StationRouteContext | null {
  return normalizeStationRouteContext({
    siteCode: params.get('site') ?? '',
    stationCode: params.get('station') ?? '',
    locationId: params.get('locationId') ?? '',
  })
}

function requiredContext(input: StationRouteContext): StationRouteContext {
  const normalized = normalizeStationRouteContext(input)
  if (!normalized) throw new Error('Invalid station route context')
  return normalized
}

export function buildStationPagePath(input: StationRouteContext): string {
  const value = requiredContext(input)
  return `/sites/${encodeURIComponent(value.siteCode)}/stations/${encodeURIComponent(value.stationCode)}/media`
}

export function buildStationStoryPath(input: StationRouteContext): string {
  return `${buildStationPagePath(input)}#story`
}

export function buildStationChatPath(input: StationRouteContext): string {
  const value = requiredContext(input)
  const stationPath = buildStationPagePath(value)
  const params = new URLSearchParams({
    locationId: value.locationId,
    persona: 'chrono',
    site: value.siteCode,
    station: value.stationCode,
    from: stationPath,
  })
  return `/chat?${params}`
}

export function buildStationCameraPath(input: StationRouteContext): string {
  const value = requiredContext(input)
  return `/photo-frame?${new URLSearchParams({
    site: value.siteCode,
    station: value.stationCode,
    locationId: value.locationId,
        mode: 'original',
  })}`
}

export function buildStationHeritagePath(input: StationRouteContext): string {
    const value = requiredContext(input)
    return `/photo-frame?${new URLSearchParams({
        site: value.siteCode,
        station: value.stationCode,
        locationId: value.locationId,
        mode: 'heritage',
    })}`
}

export function appendStationContext(path: string, input: StationRouteContext): string {
  const value = requiredContext(input)
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${new URLSearchParams({
    site: value.siteCode,
    station: value.stationCode,
    locationId: value.locationId,
  })}`
}
