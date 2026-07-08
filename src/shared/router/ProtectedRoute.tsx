// src/shared/router/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { buildLoginRedirect } from './returnTo'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-on-surface">Đang tải phiên làm việc...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginRedirect(location.pathname, location.search)} replace />
  }

  return <Outlet />
}

