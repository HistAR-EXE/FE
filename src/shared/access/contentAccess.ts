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

/** Story ch.3–6 / citations: Premium OR active Journey Pass for site (session hint). */
export function canAccessStoryPremium(user?: ContentAccessUser, siteCode?: string): boolean {
  if (hasPremiumAccess(user)) return true
  if (!siteCode || typeof sessionStorage === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(`histar_journey_pass:${siteCode.trim().toLowerCase()}`)
    if (!raw) return false
    const expires = Number(raw)
    return Number.isFinite(expires) && expires > Date.now()
  } catch {
    return false
  }
}

export function markJourneyPassActive(siteCode: string, expiresAtMs: number) {
  try {
    sessionStorage.setItem(`histar_journey_pass:${siteCode.trim().toLowerCase()}`, String(expiresAtMs))
  } catch {
    /* ignore */
  }
}

/** Hydrate Journey Pass session hints from GET /api/profile/me. */
export function hydrateJourneyPassFromProfile(
  sites: { siteCode: string; expiresAt: string }[] | null | undefined,
) {
  if (!sites?.length) return
  for (const site of sites) {
    if (!site?.siteCode || !site.expiresAt) continue
    const ms = Date.parse(site.expiresAt)
    if (!Number.isFinite(ms) || ms <= Date.now()) continue
    markJourneyPassActive(site.siteCode, ms)
  }
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

export function hasBasicGamificationAccess(user?: ContentAccessUser): boolean {
  return Boolean(user)
}

export function hasFullGamificationAccess(user?: ContentAccessUser): boolean {
  return hasPremiumAccess(user)
}
