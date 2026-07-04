import { getData, httpClient } from '../../shared/api/httpClient'

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
  role?: 'USER' | 'ADMIN' | 'TEACHER'
  tier?: 'FREE' | 'PREMIUM'
  email?: string
  avatarUrl?: string | null
}

export const authApi = {
  login: (input: LoginInput) => getData<AuthPayload>(httpClient.post('/api/auth/login', input)),
  register: (input: RegisterInput) => getData<AuthPayload>(httpClient.post('/api/auth/register', input)),
  refresh: (refreshToken: string) =>
    getData<Pick<AuthPayload, 'accessToken' | 'token' | 'refreshToken' | 'expiresIn' | 'refreshExpiresIn'>>(
      httpClient.post('/api/auth/refresh', { refreshToken }),
    ),
  logout: (refreshToken?: string | null) => getData<{ success?: boolean }>(httpClient.post('/api/auth/logout', { refreshToken })),
}

