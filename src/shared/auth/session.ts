//src/shared/auth/session.ts
const TOKEN_KEY = 'timelens_token'
const REFRESH_TOKEN_KEY = 'timelens_refresh_token'
const EXPIRES_IN_KEY = 'timelens_token_expires_in'
const REFRESH_EXPIRES_IN_KEY = 'timelens_refresh_token_expires_in'
const USER_ID_KEY = 'timelens_user_id'
const DISPLAY_NAME_KEY = 'timelens_display_name'
const EMAIL_KEY = 'timelens_email'
const ROLE_KEY = 'timelens_role'
const AVATAR_URL_KEY = 'timelens_avatar_url'

export type UserRole = 'USER' | 'ADMIN' | 'TEACHER'
export type UserTier = 'FREE' | 'PREMIUM'

const TIER_KEY = 'timelens_tier'
const TOKEN_ISSUED_AT_KEY = 'timelens_token_issued_at'

export const SESSION_CLEARED_EVENT = 'histar:session-cleared'

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
  avatarUrl?: string | null
}

export type AuthUser = {
  id: string
  displayName: string
  email: string
  role: UserRole
  tier: UserTier
  avatarUrl: string | null
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
  if (data.avatarUrl !== undefined) {
    if (data.avatarUrl) {
      localStorage.setItem(AVATAR_URL_KEY, data.avatarUrl)
    } else {
      localStorage.removeItem(AVATAR_URL_KEY)
    }
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
  localStorage.removeItem(AVATAR_URL_KEY)
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
  return {
    userId: localStorage.getItem(USER_ID_KEY),
    displayName: localStorage.getItem(DISPLAY_NAME_KEY),
    email: localStorage.getItem(EMAIL_KEY),
    role: role === 'ADMIN' || role === 'USER' || role === 'TEACHER' ? role : null,
    tier: tier === 'PREMIUM' || tier === 'FREE' ? tier : null,
    avatarUrl: localStorage.getItem(AVATAR_URL_KEY),
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
    role: (meta.role ?? 'USER') as UserRole,
    tier: (meta.tier ?? 'FREE') as UserTier,
    avatarUrl: meta.avatarUrl,
  }
}
