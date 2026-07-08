// src/features/auth/api.ts
import { getData, httpClient } from '../../shared/api/httpClient'
import type { OrgSubscription, UserRole, UserTier } from '../../shared/auth/types'

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = {
  email: string
  password: string
  displayName: string
}

export type AuthPayload = {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  refreshExpiresIn?: number
  token: string
  userId: string
  displayName: string
  role?: UserRole
  tier?: UserTier
  orgId?: string | null
  orgSubscription?: OrgSubscription
  email?: string
  avatarUrl?: string | null
  emailVerified?: boolean
  provider?: string | null
}

export const authApi = {
  login: (input: LoginInput) => getData<AuthPayload>(httpClient.post('/api/auth/login', input)),
  register: (input: RegisterInput) => getData<AuthPayload>(httpClient.post('/api/auth/register', input)),
  refresh: (refreshToken: string) =>
    getData<Pick<AuthPayload, 'accessToken' | 'token' | 'refreshToken' | 'expiresIn' | 'refreshExpiresIn'>>(
      httpClient.post('/api/auth/refresh', { refreshToken }),
    ),
  logout: (refreshToken?: string | null) => getData<{ success?: boolean }>(httpClient.post('/api/auth/logout', { refreshToken })),
  googleLogin: (idToken: string) =>
    getData<AuthPayload>(httpClient.post('/api/auth/google', { idToken })),
}
