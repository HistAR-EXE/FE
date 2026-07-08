import type { AuthUser } from '../auth/types'
import { isPremium } from '../auth/types'

export type ContentAccessUser = Pick<AuthUser, 'role' | 'tier' | 'orgId'> | null | undefined

export function isAdminPreview(role?: string): boolean {
  return role === 'ADMIN'
}

export function hasPremiumAccess(user?: ContentAccessUser): boolean {
  if (!user) return false
  if (user.orgId) return true
  return isPremium(user as AuthUser)
}

export function shouldShowB2CPaywall(user?: ContentAccessUser): boolean {
  if (!user) return false
  if (user.orgId) return false
  return !isPremium(user as AuthUser)
}

export function isLocationLockedForUser(
  location: { isUnlocked?: boolean | null },
  user?: ContentAccessUser,
): boolean {
  if (isAdminPreview(user?.role)) return false
  return location.isUnlocked === false
}

export function canAccessPremiumContent(user?: ContentAccessUser): boolean {
  return hasPremiumAccess(user)
}

export function hasFullGamificationAccess(user?: ContentAccessUser): boolean {
  return hasPremiumAccess(user)
}
