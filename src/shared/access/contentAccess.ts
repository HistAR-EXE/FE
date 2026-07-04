import type { Location } from '../../features/locations/api'

export type ContentAccessUser = {
  role?: string
  tier?: string
} | null | undefined

export function isAdminPreview(role?: string): boolean {
  return role === 'ADMIN'
}

export function hasPremiumAccess(user?: ContentAccessUser): boolean {
  if (!user) return false
  return isAdminPreview(user.role) || user.tier === 'PREMIUM'
}

export function isLocationLockedForUser(
  location: Pick<Location, 'isUnlocked'>,
  user?: ContentAccessUser,
): boolean {
  if (isAdminPreview(user?.role)) return false
  return location.isUnlocked === false
}
