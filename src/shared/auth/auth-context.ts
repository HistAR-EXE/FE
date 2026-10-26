// src/shared/auth/auth-context.ts
import { createContext } from 'react'
import type { AuthPayload, LoginInput, RegisterInput } from '../../features/auth/api'
import type { AuthUser } from './types'

export type AuthContextValue = {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  login: (input: LoginInput) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  loginWithGoogle: (idToken: string) => Promise<AuthUser>
  acceptSession: (payload: AuthPayload) => AuthUser
  logout: () => void
  updateUser: (patch: Partial<AuthUser>) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
