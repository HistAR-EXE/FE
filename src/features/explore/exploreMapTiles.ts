// src/features/explore/exploreMapTiles.ts

export type ExploreMapLayer = 'vi' | 'hybrid'

export const GOOGLE_ATTRIBUTION = '© Google Maps'

export const TILE_COMMON = {
  maxZoom: 19,
  attribution: GOOGLE_ATTRIBUTION,
  subdomains: ['0', '1', '2', '3'] as string[],
}

/** Google Maps raster tiles via Leaflet (no JS API key). */
export function googleTileUrl(layer: ExploreMapLayer, locale: string): string {
  const lyrs = layer === 'vi' ? 'm' : 'y'
  const hl = locale.startsWith('en') ? 'en' : 'vi'
  return `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}&hl=${hl}`
}

export const EXPLORE_MAP_LAYER_IDS: ExploreMapLayer[] = ['vi', 'hybrid']

export function exploreLayerLabelKey(layer: ExploreMapLayer): string {
  return layer === 'vi' ? 'map.layerMap' : 'map.layerSatellite'
}

export function exploreLayerHintKey(layer: ExploreMapLayer): string {
  return layer === 'vi' ? 'map.hintMap' : 'map.hintHybrid'
}
