import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getAlreadyLoggedInRedirect, getPostLoginRedirect } from '../auth/types'
import { peekReturnTo, popReturnTo, readReturnTo } from './returnTo'

/** Guest-only routes: /login, /register */
export function AuthRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [searchParams] = useSearchParams()

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-on-surface">Đang tải phiên làm việc...</div>
  }

  if (isAuthenticated && user) {
    const returnTo = readReturnTo(searchParams) ?? peekReturnTo() ?? popReturnTo()
    const dest = returnTo ? getPostLoginRedirect(user, returnTo) : getAlreadyLoggedInRedirect(user)
    return <Navigate to={dest} replace />
  }

  return <Outlet />
}
