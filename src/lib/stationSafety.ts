/** Stations / zones where camera UGC is disabled (MVBP §12.3 safety & reverence). */
export const CAMERA_LOCKED_STATIONS = new Set<string>([
  // Narrow tunnel / memorial — extend after Week-0 site survey.
  'ST06', // Hầm phòng thủ — ưu tiên audio, hạn chế camera trong hầm hẹp
])

export function isCameraLockedForStation(stationCode: string | null | undefined): boolean {
  if (!stationCode) return false
  return CAMERA_LOCKED_STATIONS.has(stationCode.trim().toUpperCase())
}

export function getActiveStationCode(): string | null {
  try {
    return sessionStorage.getItem('histar_active_station') || null
  } catch {
    return null
  }
}

export function setActiveStationCode(stationCode: string | null) {
  try {
    if (!stationCode) sessionStorage.removeItem('histar_active_station')
    else sessionStorage.setItem('histar_active_station', stationCode.trim().toUpperCase())
  } catch {
    /* ignore */
  }
}
