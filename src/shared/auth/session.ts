//src/shared/auth/session.ts
import { clearReturnTo } from '../router/returnTo'
import {
  normalizeOrgSubscription,
  normalizeRole,
  normalizeTier,
  type AuthUser,
  type OrgSubscription,
  type UserRole,
  type UserTier,
} from './types'

export type { AuthUser, OrgSubscription, UserRole, UserTier } from './types'

const TOKEN_KEY = 'timelens_token'
const REFRESH_TOKEN_KEY = 'timelens_refresh_token'
const EXPIRES_IN_KEY = 'timelens_token_expires_in'
const REFRESH_EXPIRES_IN_KEY = 'timelens_refresh_token_expires_in'
const USER_ID_KEY = 'timelens_user_id'
const DISPLAY_NAME_KEY = 'timelens_display_name'
const EMAIL_KEY = 'timelens_email'
const ROLE_KEY = 'timelens_role'
const AVATAR_URL_KEY = 'timelens_avatar_url'
const TIER_KEY = 'timelens_tier'
const ORG_ID_KEY = 'timelens_org_id'
const ORG_SUBSCRIPTION_KEY = 'timelens_org_subscription'
const TOKEN_ISSUED_AT_KEY = 'timelens_token_issued_at'

const EMAIL_VERIFIED_KEY = 'timelens_email_verified'

export const SESSION_CLEARED_EVENT = 'histar:session-cleared'
export const SESSION_REFRESHED_EVENT = 'histar:session-refreshed'
export const EMAIL_VERIFIED_EVENT = 'histar:email-verified'

export type SessionData = {
  token: string
  refreshToken?: string
  expiresIn?: number
  refreshExpiresIn?: number
  userId: string
  displayName: string
  email?: string
  role?: UserRole
  tier?: UserTier
  orgId?: string | null
  orgSubscription?: OrgSubscription
  avatarUrl?: string | null
  emailVerified?: boolean
}

export function saveSession(data: SessionData) {
  localStorage.setItem(TOKEN_KEY, data.token)
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
  }
  if (typeof data.expiresIn === 'number') {
    localStorage.setItem(EXPIRES_IN_KEY, String(data.expiresIn))
    localStorage.setItem(TOKEN_ISSUED_AT_KEY, String(Date.now()))
  }
  if (typeof data.refreshExpiresIn === 'number') {
    localStorage.setItem(REFRESH_EXPIRES_IN_KEY, String(data.refreshExpiresIn))
  }
  localStorage.setItem(USER_ID_KEY, data.userId)
  localStorage.setItem(DISPLAY_NAME_KEY, data.displayName)
  if (data.email) {
    localStorage.setItem(EMAIL_KEY, data.email)
  }
  if (data.role) {
    localStorage.setItem(ROLE_KEY, data.role)
  }
  if (data.tier) {
    localStorage.setItem(TIER_KEY, data.tier)
  }
  if (data.orgId) {
    localStorage.setItem(ORG_ID_KEY, data.orgId)
  } else if (data.orgId === null) {
    localStorage.removeItem(ORG_ID_KEY)
  }
  if (data.orgSubscription) {
    localStorage.setItem(ORG_SUBSCRIPTION_KEY, data.orgSubscription)
  }
  if (data.avatarUrl !== undefined) {
    if (data.avatarUrl) {
      localStorage.setItem(AVATAR_URL_KEY, data.avatarUrl)
    } else {
      localStorage.removeItem(AVATAR_URL_KEY)
    }
  }
  if (typeof data.emailVerified === 'boolean') {
    localStorage.setItem(EMAIL_VERIFIED_KEY, data.emailVerified ? '1' : '0')
  }
}

export function markEmailVerifiedInStorage(): void {
  localStorage.setItem(EMAIL_VERIFIED_KEY, '1')
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EMAIL_VERIFIED_EVENT))
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(EXPIRES_IN_KEY)
  localStorage.removeItem(REFRESH_EXPIRES_IN_KEY)
  localStorage.removeItem(TOKEN_ISSUED_AT_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(DISPLAY_NAME_KEY)
  localStorage.removeItem(EMAIL_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(TIER_KEY)
  localStorage.removeItem(ORG_ID_KEY)
  localStorage.removeItem(ORG_SUBSCRIPTION_KEY)
  localStorage.removeItem(AVATAR_URL_KEY)
  localStorage.removeItem(EMAIL_VERIFIED_KEY)
  clearReturnTo()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_CLEARED_EVENT))
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getSessionMeta() {
  const role = localStorage.getItem(ROLE_KEY)
  const tier = localStorage.getItem(TIER_KEY)
  const orgSub = localStorage.getItem(ORG_SUBSCRIPTION_KEY)
  const emailVerifiedRaw = localStorage.getItem(EMAIL_VERIFIED_KEY)
  return {
    userId: localStorage.getItem(USER_ID_KEY),
    displayName: localStorage.getItem(DISPLAY_NAME_KEY),
    email: localStorage.getItem(EMAIL_KEY),
    role: role ? normalizeRole(role) : null,
    tier: tier ? normalizeTier(tier) : null,
    orgId: localStorage.getItem(ORG_ID_KEY),
    orgSubscription: orgSub ? normalizeOrgSubscription(orgSub) : null,
    avatarUrl: localStorage.getItem(AVATAR_URL_KEY),
    emailVerified: emailVerifiedRaw === '1' ? true : emailVerifiedRaw === '0' ? false : undefined,
  }
}

export function isAccessTokenExpired(): boolean {
  const issuedRaw = localStorage.getItem(TOKEN_ISSUED_AT_KEY)
  const expiresRaw = localStorage.getItem(EXPIRES_IN_KEY)
  if (!issuedRaw || !expiresRaw) return false
  const issuedAt = Number(issuedRaw)
  const expiresInSec = Number(expiresRaw)
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresInSec) || expiresInSec <= 0) return false
  return Date.now() >= issuedAt + expiresInSec * 1000
}

export function readStoredUser(): AuthUser | null {
  const token = getToken()
  if (!token || isAccessTokenExpired()) return null
  const meta = getSessionMeta()
  if (!token || !meta.userId || !meta.displayName) return null
  return {
    id: meta.userId,
    displayName: meta.displayName,
    email: meta.email ?? '',
    role: meta.role ?? 'USER',
    tier: meta.tier ?? 'FREE',
    orgId: meta.orgId,
    orgSubscription: meta.orgSubscription ?? 'NONE',
    avatarUrl: meta.avatarUrl,
    emailVerified: meta.emailVerified,
  }
}
