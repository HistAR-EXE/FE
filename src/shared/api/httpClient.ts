// src/shared/api/httpClient.ts
import axios from 'axios'
import { getRefreshToken, getToken, clearSession, saveSession, SESSION_REFRESHED_EVENT } from '../auth/session'
import { normalizeOrgSubscription, normalizeRole, normalizeTier } from '../auth/types'
import { ApiError, isApiResponse, isPageResponse, type ApiErrorPayload, type PageResponse } from './contracts'
import { appEnv } from '../config/env'

export const httpClient = axios.create({
  baseURL: appEnv.apiUrl || '',
  headers: {
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  if (!isRefreshing) {
    isRefreshing = true
    refreshPromise = axios
      .post(`${appEnv.apiUrl || ''}/api/auth/refresh`, { refreshToken }, { headers: { 'Content-Type': 'application/json' } })
      .then((res) => {
        const payload = isApiResponse(res.data) ? (res.data.data as Record<string, unknown>) : (res.data as Record<string, unknown>)
        const nextAccessToken = (payload.accessToken as string | undefined) ?? (payload.token as string | undefined)
        const userId = localStorage.getItem('timelens_user_id') ?? ''
        const displayName = localStorage.getItem('timelens_display_name') ?? ''
        const email = localStorage.getItem('timelens_email') ?? undefined
        const roleRaw = localStorage.getItem('timelens_role')
        const role = roleRaw ? normalizeRole(roleRaw) : undefined
        const tierRaw = localStorage.getItem('timelens_tier')
        const tier = tierRaw ? normalizeTier(tierRaw) : undefined
        const orgId = localStorage.getItem('timelens_org_id') ?? undefined
        const orgSubRaw = localStorage.getItem('timelens_org_subscription')
        const orgSubscription = orgSubRaw ? normalizeOrgSubscription(orgSubRaw) : undefined
        const avatarUrl = localStorage.getItem('timelens_avatar_url')
        if (!nextAccessToken || !userId || !displayName) return null
        saveSession({
          token: nextAccessToken,
          refreshToken: (payload.refreshToken as string | undefined) ?? refreshToken,
          expiresIn: typeof payload.expiresIn === 'number' ? payload.expiresIn : undefined,
          refreshExpiresIn: typeof payload.refreshExpiresIn === 'number' ? payload.refreshExpiresIn : undefined,
          userId,
          displayName,
          email,
          role,
          tier,
          orgId,
          orgSubscription,
          avatarUrl,
        })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(SESSION_REFRESHED_EVENT))
        }
        return nextAccessToken
      })
      .catch(() => null)
      .finally(() => {
        isRefreshing = false
      })
  }
  return refreshPromise
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config as Record<string, unknown> | undefined
    const status = error?.response?.status ?? 500
    const payload = error?.response?.data as Partial<ApiErrorPayload> | undefined
    const message = payload?.message ?? error?.message ?? 'Unexpected error'
    const code = payload?.code ?? (status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR')

    if (status === 401 && original && !original._retry) {
      original._retry = true
      const nextAccessToken = await tryRefreshToken()
      if (nextAccessToken && typeof original.headers === 'object' && original.headers) {
        ;(original.headers as Record<string, string>).Authorization = `Bearer ${nextAccessToken}`
        return httpClient(original)
      }
      clearSession()
    }

    throw new ApiError({
      message,
      code,
      status,
      fieldErrors: payload?.fieldErrors,
      upgradeUrl: payload?.upgradeUrl,
      quotaType: payload?.type,
      upgradePackage: payload?.upgradePackage,
    })
  },
)

export async function getData<T>(request: Promise<{ data: unknown }>): Promise<T> {
  const res = await request
  if (isApiResponse<T>(res.data)) {
    return res.data.data
  }
  return res.data as T
}

export async function getListData<T>(request: Promise<{ data: unknown }>): Promise<T[]> {
  const data = await getData<unknown>(request)
  if (isPageResponse<T>(data)) return data.items
  if (Array.isArray(data)) return data as T[]
  return []
}

export async function getPageData<T>(request: Promise<{ data: unknown }>): Promise<PageResponse<T>> {
  const data = await getData<unknown>(request)
  if (isPageResponse<T>(data)) return data
  if (Array.isArray(data)) {
    return { items: data as T[], page: 0, size: data.length, totalItems: data.length, totalPages: 1 }
  }
  return { items: [], page: 0, size: 0, totalItems: 0, totalPages: 0 }
}

