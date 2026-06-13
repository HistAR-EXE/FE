import { useEffect, useState, type ReactNode } from 'react'
import { profileApi } from '../../features/profile/api'
import { authApi, type AuthPayload, type LoginInput, type RegisterInput } from '../../features/auth/api'
import { useAppMode } from '../context/useAppMode'
import { AuthContext, type AuthContextValue } from './auth-context'
import {
  clearSession,
  getRefreshToken,
  getToken,
  readStoredUser,
  saveSession,
  type AuthUser,
  type UserRole,
} from './session'

function toUser(payload: AuthPayload): AuthUser {
  return {
    id: payload.userId,
    displayName: payload.displayName,
    email: payload.email ?? '',
    role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
    avatarUrl: payload.avatarUrl ?? null,
  }
}

function profileToUser(profile: {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role?: string
}): AuthUser {
  return {
    id: profile.id,
    displayName: profile.displayName,
    email: profile.email,
    role: profile.role === 'ADMIN' ? 'ADMIN' : 'USER',
    avatarUrl: profile.avatarUrl,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { clearMode } = useAppMode()
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()))

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    profileApi
      .me()
      .then((profile) => {
        if (cancelled) return
        const next = profileToUser(profile)
        setUser(next)
        saveSession({
          token,
          refreshToken: getRefreshToken() ?? undefined,
          userId: next.id,
          displayName: next.displayName,
          email: next.email,
          role: next.role,
          avatarUrl: next.avatarUrl,
        })
      })
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
  }, [])

  const storeAuth = (payload: AuthPayload) => {
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
      avatarUrl: next.avatarUrl,
    })
    setUser(next)
  }

  const login = async (input: LoginInput) => {
    const payload = await authApi.login(input)
    storeAuth(payload)
  }

  const register = async (input: RegisterInput) => {
    const payload = await authApi.register(input)
    storeAuth(payload)
  }

  const logout = () => {
    authApi.logout(getRefreshToken()).catch(() => undefined)
    clearSession()
    clearMode()
    setUser(null)
  }

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser((current) => {
      if (!current) return current
      const next: AuthUser = { ...current, ...patch }
      const token = getToken()
      if (token) {
        saveSession({
          token,
          refreshToken: getRefreshToken() ?? undefined,
          userId: next.id,
          displayName: next.displayName,
          email: next.email,
          role: next.role as UserRole,
          avatarUrl: next.avatarUrl,
        })
      }
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
