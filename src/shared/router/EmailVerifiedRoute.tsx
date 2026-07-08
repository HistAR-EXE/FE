import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { needsEmailVerification } from '../auth/types'
import { stashReturnTo } from './returnTo'

const UNVERIFIED_ALLOWED = new Set(['/verify-email/pending', '/settings'])

/** Blocks app routes until email is verified (soft_pending). Must sit inside ProtectedRoute. */
export function EmailVerifiedRoute() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Outlet />
  }

  if (UNVERIFIED_ALLOWED.has(location.pathname)) {
    return <Outlet />
  }

  if (needsEmailVerification(user)) {
    const target = `${location.pathname}${location.search}`
    stashReturnTo(target)
    return <Navigate to="/verify-email/pending" replace />
  }

  return <Outlet />
}
