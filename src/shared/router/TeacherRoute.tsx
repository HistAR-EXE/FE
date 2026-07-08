import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isTeacher } from '../auth/types'
import { buildLoginRedirect } from './returnTo'

export function TeacherRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant text-sm">
        Đang tải...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginRedirect(location.pathname, location.search)} replace />
  }

  if (!isTeacher(user)) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
