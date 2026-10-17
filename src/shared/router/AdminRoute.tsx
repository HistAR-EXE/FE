// // src/shared/router/AdminRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isAdmin, isTeacher } from '../auth/types'
import { buildLoginRedirect } from './returnTo'

export function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Đang xác thực...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginRedirect(location.pathname, location.search)} replace />
  }

  // React 18 batching race: saveSession() runs synchronously (localStorage updated → isAuthenticated=true)
  // but setUser() is batched (user=null until next render flush). Wait for user to load.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Đang xác thực...
      </div>
    )
  }

  if (!isAdmin(user)) {
    return <Navigate to={isTeacher(user) ? '/teacher' : '/home'} replace />
  }

  return <Outlet />
}
