import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/useAuth'
import { siteWorkspaceApi } from './api'

const membershipRequests = new Map<string, Promise<boolean>>()

function loadHasMembership(userId: string): Promise<boolean> {
  const existing = membershipRequests.get(userId)
  if (existing) return existing
  const request = siteWorkspaceApi
    .mine()
    .then((items) => Array.isArray(items) && items.length > 0)
    .catch(() => false)
  membershipRequests.set(userId, request)
  return request
}

/** True only when the signed-in user has at least one site-workspace membership. */
export function useSiteWorkspaceNavVisible(): boolean {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!userId) {
      setVisible(false)
      return
    }
    let cancelled = false
    loadHasMembership(userId).then((hasMembership) => {
      if (!cancelled) setVisible(hasMembership)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  return visible
}
