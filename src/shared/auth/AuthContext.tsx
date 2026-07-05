// src/shared/auth/AuthContext.tsx
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { profileApi } from '../../features/profile/api'
import { authApi, type AuthPayload, type LoginInput, type RegisterInput } from '../../features/auth/api'
import { AuthContext, type AuthContextValue } from './auth-context'
import { normalizeOrgSubscription, normalizeRole, normalizeTier, type AuthUser } from './types'
import {
  clearSession,
  getRefreshToken,
  getToken,
  isAccessTokenExpired,
  readStoredUser,
  saveSession,
  SESSION_CLEARED_EVENT,
  SESSION_REFRESHED_EVENT,
} from './session'

function toUser(payload: AuthPayload): AuthUser {
  return {
    id: payload.userId,
    displayName: payload.displayName,
    email: payload.email ?? '',
    role: normalizeRole(payload.role),
    tier: normalizeTier(payload.tier),
    orgId: payload.orgId ?? null,
    orgSubscription: normalizeOrgSubscription(payload.orgSubscription),
    avatarUrl: payload.avatarUrl ?? null,
  }
}

function profileToUser(profile: {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role?: string
  tier?: string
  orgId?: string | null
  orgName?: string | null
  orgSubscription?: string
  orgRole?: string | null
}): AuthUser {
  return {
    id: profile.id,
    displayName: profile.displayName,
    email: profile.email,
    role: normalizeRole(profile.role),
    tier: normalizeTier(profile.tier),
    orgId: profile.orgId ?? null,
    orgSubscription: normalizeOrgSubscription(profile.orgSubscription),
    orgName: profile.orgName ?? null,
    orgRole: profile.orgRole ?? null,
    avatarUrl: profile.avatarUrl,
  }
}

function persistUserSession(next: AuthUser) {
  const token = getToken()
  if (!token) return
  saveSession({
    token,
    refreshToken: getRefreshToken() ?? undefined,
    userId: next.id,
    displayName: next.displayName,
    email: next.email,
    role: next.role,
    tier: next.tier,
    orgId: next.orgId,
    orgSubscription: next.orgSubscription,
    avatarUrl: next.avatarUrl,
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()) && !isAccessTokenExpired())

  const rehydrateFromProfile = useCallback(async () => {
    const token = getToken()
    if (!token || isAccessTokenExpired()) return
    const profile = await profileApi.me()
    const next = profileToUser(profile)
    setUser(next)
    persistUserSession(next)
  }, [])

  useEffect(() => {
    const onSessionCleared = () => setUser(null)
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared)
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared)
  }, [])

  useEffect(() => {
    const onSessionRefreshed = () => {
      rehydrateFromProfile().catch(() => undefined)
    }
    window.addEventListener(SESSION_REFRESHED_EVENT, onSessionRefreshed)
    return () => window.removeEventListener(SESSION_REFRESHED_EVENT, onSessionRefreshed)
  }, [rehydrateFromProfile])

  useEffect(() => {
    const token = getToken()
    if (!token || isAccessTokenExpired()) {
      if (token && isAccessTokenExpired()) clearSession()
      setUser(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    rehydrateFromProfile()
      .catch(() => {
        if (cancelled) return
        clearSession()
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [rehydrateFromProfile])

  const storeAuth = (payload: AuthPayload): AuthUser => {
    const accessToken = payload.accessToken ?? payload.token
    const next = toUser(payload)
    saveSession({
      token: accessToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
      refreshExpiresIn: payload.refreshExpiresIn,
      userId: next.id,
      displayName: next.displayName,
      email: next.email,
      role: next.role,
      tier: next.tier,
      orgId: next.orgId,
      orgSubscription: next.orgSubscription,
      avatarUrl: next.avatarUrl,
    })
    setUser(next)
    return next
  }

  const login = async (input: LoginInput): Promise<AuthUser> => {
    const payload = await authApi.login(input)
    return storeAuth(payload)
  }

  const register = async (input: RegisterInput): Promise<AuthUser> => {
    const payload = await authApi.register(input)
    return storeAuth(payload)
  }

  const logout = () => {
    authApi.logout(getRefreshToken()).catch(() => undefined)
    clearSession()
    setUser(null)
  }

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser((current) => {
      if (!current) return current
      const next: AuthUser = { ...current, ...patch }
      persistUserSession(next)
      return next
    })
  }

  const value: AuthContextValue = {
    isAuthenticated: Boolean(user && getToken()),
    isLoading,
    user,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
