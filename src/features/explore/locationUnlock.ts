import type { Location } from '../locations/api'
import { isLocationLockedForUser, type ContentAccessUser } from '../../shared/access/contentAccess'

export const LOCATION_UNLOCKED_EVENT = 'histar:location-unlocked'

export function isLocationLocked(
  location: Pick<Location, 'isUnlocked'>,
  user?: ContentAccessUser,
): boolean {
  return isLocationLockedForUser(location, user)
}

export function dispatchLocationUnlocked(locationIds: string[]): void {
  if (locationIds.length === 0) return
  window.dispatchEvent(new CustomEvent(LOCATION_UNLOCKED_EVENT, { detail: { locationIds } }))
}
