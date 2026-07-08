import { isSafeRedirect } from '../auth/types'

export const RETURN_TO_KEY = 'histar:returnTo'

export function buildLoginRedirect(pathname: string, search: string): string {
  const returnTo = encodeURIComponent(`${pathname}${search}`)
  return `/login?returnTo=${returnTo}`
}

export function readReturnTo(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get('returnTo')
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
    return isSafeRedirect(decoded) ? decoded : null
  } catch {
    return null
  }
}

export function stashReturnTo(url: string | null | undefined): void {
  if (!url || !isSafeRedirect(url)) return
  sessionStorage.setItem(RETURN_TO_KEY, url)
}

export function peekReturnTo(): string | null {
  const v = sessionStorage.getItem(RETURN_TO_KEY)
  return v && isSafeRedirect(v) ? v : null
}

export function popReturnTo(): string | null {
  const v = sessionStorage.getItem(RETURN_TO_KEY)
  sessionStorage.removeItem(RETURN_TO_KEY)
  return v && isSafeRedirect(v) ? v : null
}

export function clearReturnTo(): void {
  sessionStorage.removeItem(RETURN_TO_KEY)
}

export function resolveReturnTo(searchParams: URLSearchParams, legacyFrom?: string | null): string | null {
  return readReturnTo(searchParams) ?? (legacyFrom && isSafeRedirect(legacyFrom) ? legacyFrom : peekReturnTo())
}
