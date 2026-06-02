import { createContext } from 'react'
import type { LoginInput, RegisterInput } from '../../features/auth/api'

type AuthUser = {
  id: string
  displayName: string
}

export type AuthContextValue = {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

