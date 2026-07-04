// src/features/explore/vietnamGeo.ts
/** Vietnam mainland outline ring [lng, lat] — world.geo.json / Natural Earth. */
export const VIETNAM_MAINLAND_RING: ReadonlyArray<readonly [number, number]> = [
  [108.05018, 21.55238],
  [106.715068, 20.696851],
  [105.881682, 19.75205],
  [105.662006, 19.058165],
  [106.426817, 18.004121],
  [107.361954, 16.697457],
  [108.269495, 16.079742],
  [108.877107, 15.276691],
  [109.33527, 13.426028],
  [109.200136, 11.666859],
  [108.36613, 11.008321],
  [107.220929, 10.364484],
  [106.405113, 9.53084],
  [105.158264, 8.59976],
  [104.795185, 9.241038],
  [105.076202, 9.918491],
  [104.334335, 10.486544],
  [105.199915, 10.88931],
  [106.24967, 10.961812],
  [105.810524, 11.567615],
  [107.491403, 12.337206],
  [107.614548, 13.535531],
  [107.382727, 14.202441],
  [107.564525, 15.202173],
  [107.312706, 15.908538],
  [106.556008, 16.604284],
  [105.925762, 17.485315],
  [105.094598, 18.666975],
  [103.896532, 19.265181],
  [104.183388, 19.624668],
  [104.822574, 19.886642],
  [104.435, 20.758733],
  [103.203861, 20.766562],
  [102.754896, 21.675137],
  [102.170436, 22.464753],
  [102.706992, 22.708795],
  [103.504515, 22.703757],
  [104.476858, 22.81915],
  [105.329209, 23.352063],
  [105.811247, 22.976892],
  [106.725403, 22.794268],
  [106.567273, 22.218205],
  [107.04342, 21.811899],
  [108.05018, 21.55238],
]

export const MAP_VIEWBOX = { width: 360, height: 740 } as const

const MIN_LNG = 102.17
const MAX_LNG = 109.33
const MIN_LAT = 8.6
const MAX_LAT = 23.35

export type VietnamRegion = 'north' | 'central' | 'south'

export const REGION_META: Record<
  VietnamRegion,
  { label: string; fill: string; stroke: string; marker: string; glow: string }
> = {
  north: {
    label: 'Bắc Bộ',
    fill: 'rgba(242, 191, 80, 0.22)',
    stroke: 'rgba(242, 191, 80, 0.45)',
    marker: '#f2bf50',
    glow: 'rgba(242, 191, 80, 0.55)',
  },
  central: {
    label: 'Trung Bộ',
    fill: 'rgba(68, 219, 213, 0.2)',
    stroke: 'rgba(68, 219, 213, 0.45)',
    marker: '#44dbd5',
    glow: 'rgba(68, 219, 213, 0.55)',
  },
  south: {
    label: 'Nam Bộ',
    fill: 'rgba(224, 122, 95, 0.22)',
    stroke: 'rgba(224, 122, 95, 0.5)',
    marker: '#e07a5f',
    glow: 'rgba(224, 122, 95, 0.55)',
  },
}

export function geoToMapPoint(lng: number, lat: number): { x: number; y: number } {
  return {
    x: ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * MAP_VIEWBOX.width,
    y: ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * MAP_VIEWBOX.height,
  }
}

export function latToMapY(lat: number): number {
  return ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * MAP_VIEWBOX.height
}

export function getRegionFromLat(lat: number): VietnamRegion {
  if (lat >= 19.5) return 'north'
  if (lat >= 14) return 'central'
  return 'south'
}

export function ringToSvgPath(ring: ReadonlyArray<readonly [number, number]>): string {
  if (ring.length === 0) return ''
  const [first, ...rest] = ring
  const start = geoToMapPoint(first[0], first[1])
  let path = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`
  for (const [lng, lat] of rest) {
    const point = geoToMapPoint(lng, lat)
    path += ` L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }
  return `${path} Z`
}

export const VIETNAM_OUTLINE_PATH = ringToSvgPath(VIETNAM_MAINLAND_RING)

/** Decorative latitude guide lines inside the map. */
export const LATITUDE_GUIDES = [22, 19.5, 17, 14, 11] as const

export const REGION_LABELS: { region: VietnamRegion; lat: number; lng: number }[] = [
  { region: 'north', lat: 21.4, lng: 105.2 },
  { region: 'central', lat: 16.5, lng: 106.8 },
  { region: 'south', lat: 11.2, lng: 106.4 },
]
