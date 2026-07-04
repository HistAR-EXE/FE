import type { Location } from '../locations/api'

export const LOCATION_UNLOCKED_EVENT = 'histar:location-unlocked'

export function isLocationLocked(location: Pick<Location, 'isUnlocked'>): boolean {
  return location.isUnlocked === false
}

export function dispatchLocationUnlocked(locationIds: string[]): void {
  if (locationIds.length === 0) return
  window.dispatchEvent(new CustomEvent(LOCATION_UNLOCKED_EVENT, { detail: { locationIds } }))
}
