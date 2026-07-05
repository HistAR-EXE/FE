// src/shared/router/ModeGuardRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppMode } from '../context/useAppMode'

const MODE_EXEMPT_PATHS = ['/mode-select', '/login', '/']

export function ModeGuardRoute() {
  const { mode } = useAppMode()
  const location = useLocation()

  if (mode === null && !MODE_EXEMPT_PATHS.includes(location.pathname)) {
    return <Navigate to="/mode-select" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (mode === 'offline' && location.pathname.startsWith('/chat')) {
    return <Navigate to="/scan" replace />
  }

  if (mode === 'online' && location.pathname === '/scan') {
    return <Navigate to="/explore" replace />
  }

  return <Outlet />
}
