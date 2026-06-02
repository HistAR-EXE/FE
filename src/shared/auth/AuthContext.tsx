import { useState, type ReactNode } from 'react'
import { clearSession, getRefreshToken, getSessionMeta, getToken, saveSession } from './session'
import { authApi, type AuthPayload, type LoginInput, type RegisterInput } from '../../features/auth/api'
import { AuthContext, type AuthContextValue } from './auth-context'

type AuthUser = {
  id: string
  displayName: string
}

function toUser(payload: AuthPayload): AuthUser {
  return { id: payload.userId, displayName: payload.displayName }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = getToken()
  const meta = getSessionMeta()
  const initialUser = token && meta.userId && meta.displayName ? { id: meta.userId, displayName: meta.displayName } : null
  const [user, setUser] = useState<AuthUser | null>(initialUser)

  const storeAuth = (payload: AuthPayload) => {
    const accessToken = payload.accessToken ?? payload.token
    saveSession({
      token: accessToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
      refreshExpiresIn: payload.refreshExpiresIn,
      userId: payload.userId,
      displayName: payload.displayName,
    })
    setUser(toUser(payload))
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
    setUser(null)
  }

  const value: AuthContextValue = {
    isAuthenticated: Boolean(user && getToken()),
    isLoading: false,
    user,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

