import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/useAuth'
import { siteWorkspaceApi } from './api'

const membershipRequests = new Map<string, Promise<boolean>>()
const listeners = new Set<() => void>()

function loadHasMembership(userId: string): Promise<boolean> {
  const existing = membershipRequests.get(userId)
  if (existing) return existing
  const request = siteWorkspaceApi
    .mine()
    .then((items) => Array.isArray(items) && items.length > 0)
    .catch((error: unknown) => {
      if (membershipRequests.get(userId) === request) membershipRequests.delete(userId)
      throw error
    })
  membershipRequests.set(userId, request)
  return request
}

/** Drop cached /mine results so the next render refetches. Failures are never kept. */
export function invalidateSiteWorkspaceNav(): void {
  membershipRequests.clear()
  listeners.forEach((listener) => listener())
}

/** True only when the signed-in user has at least one site-workspace membership. */
export function useSiteWorkspaceNavVisible(): boolean {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [visible, setVisible] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const listener = () => setNonce((current) => current + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setVisible(false)
      return
    }
    let cancelled = false
    loadHasMembership(userId)
      .then((hasMembership) => {
        if (!cancelled) setVisible(hasMembership)
      })
      .catch(() => {
        if (!cancelled) setVisible(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, nonce])

  return visible
}
