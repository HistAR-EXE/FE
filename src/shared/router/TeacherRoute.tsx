import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function TeacherRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant text-sm">
        Đang tải...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
