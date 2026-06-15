import type { Location } from '../locations/api'
import { getRegionFromLat, type VietnamRegion } from './vietnamGeo'

export type MapMarker = {
  location: Location
  lat: number
  lng: number
  region: VietnamRegion
}

export function buildMapMarkers(locations: Location[]): MapMarker[] {
  return locations
    .filter((loc) => Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude))
    .map((location) => ({
      location,
      lat: location.latitude,
      lng: location.longitude,
      region: getRegionFromLat(location.latitude),
    }))
}

export function normalizeHeritageName(name: string): string {
  return name.replace(/Vướng/g, 'Vương')
}

/** Leaflet map bounds — lãnh thổ Việt Nam (đất liền + Hoàng Sa + Trường Sa). */
export const VIETNAM_MAP_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 101.8],
  [24.0, 118.5],
]

export const VIETNAM_MAP_CENTER: [number, number] = [14.5, 108.5]
export const VIETNAM_DEFAULT_ZOOM = 5

/** Quần đảo thuộc chủ quyền — hiển thị nhãn tiếng Việt (không dựa tile OSM). */
export const VIETNAM_SOVEREIGN_ARCHIPELAGOS = [
  {
    id: 'hoang-sa',
    lat: 16.53,
    lng: 111.62,
    label: 'Quần đảo Hoàng Sa',
    hoverText: 'Quần đảo Hoàng Sa thuộc chủ quyền Việt Nam',
  },
  {
    id: 'truong-sa',
    lat: 8.65,
    lng: 111.92,
    label: 'Quần đảo Trường Sa',
    hoverText: 'Quần đảo Trường Sa thuộc chủ quyền Việt Nam',
  },
] as const

/** Góc nhìn toàn cảnh: di tích + quần đảo. */
export function buildVietnamFitPoints(markers: MapMarker[]): [number, number][] {
  const heritage = markers.map((m) => [m.lat, m.lng] as [number, number])
  const islands = VIETNAM_SOVEREIGN_ARCHIPELAGOS.map((a) => [a.lat, a.lng] as [number, number])
  return [...heritage, ...islands]
}
