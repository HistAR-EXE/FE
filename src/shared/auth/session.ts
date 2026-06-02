const TOKEN_KEY = 'timelens_token'
const REFRESH_TOKEN_KEY = 'timelens_refresh_token'
const EXPIRES_IN_KEY = 'timelens_token_expires_in'
const REFRESH_EXPIRES_IN_KEY = 'timelens_refresh_token_expires_in'
const USER_ID_KEY = 'timelens_user_id'
const DISPLAY_NAME_KEY = 'timelens_display_name'

export type SessionData = {
  token: string
  refreshToken?: string
  expiresIn?: number
  refreshExpiresIn?: number
  userId: string
  displayName: string
}

export function saveSession(data: SessionData) {
  localStorage.setItem(TOKEN_KEY, data.token)
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
  }
  if (typeof data.expiresIn === 'number') {
    localStorage.setItem(EXPIRES_IN_KEY, String(data.expiresIn))
  }
  if (typeof data.refreshExpiresIn === 'number') {
    localStorage.setItem(REFRESH_EXPIRES_IN_KEY, String(data.refreshExpiresIn))
  }
  localStorage.setItem(USER_ID_KEY, data.userId)
  localStorage.setItem(DISPLAY_NAME_KEY, data.displayName)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(EXPIRES_IN_KEY)
  localStorage.removeItem(REFRESH_EXPIRES_IN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(DISPLAY_NAME_KEY)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getSessionMeta() {
  return {
    userId: localStorage.getItem(USER_ID_KEY),
    displayName: localStorage.getItem(DISPLAY_NAME_KEY),
  }
}

