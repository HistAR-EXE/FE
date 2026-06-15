import type { TileLayerOptions } from 'leaflet'

export type ExploreMapLayer = 'vi' | 'hybrid'

/** Voyager đầy đủ — nhãn gắn trong tile, hiển thị ổn định đến zoom 19. */
export const VOYAGER_MAP_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const REFERENCE_LABELS_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'

export const TILE_COMMON: TileLayerOptions = {
  maxZoom: 19,
  maxNativeZoom: 19,
  detectRetina: false,
  keepBuffer: 4,
  subdomains: 'abcd',
}

export const VI_ATTRIBUTION =
  'Bản đồ &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
export const HYBRID_ATTRIBUTION = 'Ảnh &copy; Esri · Nhãn &copy; Esri'

export const EXPLORE_MAP_LAYERS: { id: ExploreMapLayer; label: string }[] = [
  { id: 'vi', label: 'Bản đồ' },
  { id: 'hybrid', label: 'Vệ tinh' },
]

export function exploreLayerHint(layer: ExploreMapLayer): string {
  if (layer === 'vi') return 'Nhãn hiển thị mọi mức zoom'
  return 'Ảnh vệ tinh Esri + tên đường'
}
