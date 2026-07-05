// // src/shared/router/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isAdmin, isTeacher } from '../auth/types'

export function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Đang xác thực...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin(user)) {
    return <Navigate to={isTeacher(user) ? '/teacher' : '/home'} replace />
  }

  return <Outlet />
}
