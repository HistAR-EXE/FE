// // src/shared/router/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

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

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/profile" replace />
  }

  return <Outlet />
}
