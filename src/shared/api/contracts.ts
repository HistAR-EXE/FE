export type ApiResponse<T> = {
  success: boolean
  message?: string | null
  data: T
}

export type PageResponse<T> = {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export type ApiErrorPayload = {
  success: false
  code: string
  message: string
  timestamp?: string
  fieldErrors?: Record<string, string>
}

export class ApiError extends Error {
  code: string
  status: number
  fieldErrors?: Record<string, string>

  constructor(payload: { message: string; code?: string; status?: number; fieldErrors?: Record<string, string> }) {
    super(payload.message)
    this.name = 'ApiError'
    this.code = payload.code ?? 'INTERNAL_ERROR'
    this.status = payload.status ?? 500
    this.fieldErrors = payload.fieldErrors
  }
}

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== 'object') return false
  return 'success' in value && 'data' in value
}

export function isPageResponse<T>(value: unknown): value is PageResponse<T> {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return Array.isArray(obj.items) && typeof obj.page === 'number' && typeof obj.totalItems === 'number'
}

