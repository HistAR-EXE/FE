import type { AuthUser } from '../auth/types'
import { isPremium } from '../auth/types'

export type ContentAccessUser = Pick<AuthUser, 'role' | 'tier'> | null | undefined

export function isAdminPreview(role?: string): boolean {
  return role === 'ADMIN'
}

export function hasPremiumAccess(user?: ContentAccessUser): boolean {
  if (!user) return false
  return isPremium(user as AuthUser)
}

export function isLocationLockedForUser(
  location: { isUnlocked?: boolean },
  user?: ContentAccessUser,
): boolean {
  if (isAdminPreview(user?.role)) return false
  return location.isUnlocked === false
}

export function canAccessPremiumContent(user?: ContentAccessUser): boolean {
  return hasPremiumAccess(user)
}
