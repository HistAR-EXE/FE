import type { ReactNode } from 'react'
import { Navigate, Routes, useLocation } from 'react-router-dom'
import { locationSlug, resolveLocationParam } from '../config/locationSlug'

/** Keep readable browser URLs while supplying UUIDs to existing API consumers. */
export function ReadableLocationRoutes({ children }: { children: ReactNode }) {
  const location = useLocation()
  const publicRoute = !location.pathname.startsWith('/admin')
  const convertPath = (pathname: string, readable: boolean) => pathname.replace(/^(\/tour\/360\/|\/diorama\/)([^/]+)$/, (_, prefix: string, value: string) => {
    const id = resolveLocationParam(value)
    return prefix + (id ? readable ? locationSlug(id) : id : value)
  })
  const convertSearch = (readable: boolean) => {
    const params = new URLSearchParams(location.search)
    const id = resolveLocationParam(params.get('locationId'))
    if (id) params.set('locationId', readable ? locationSlug(id) : id)
    const search = params.toString()
    return search ? `?${search}` : ''
  }
  const pathname = publicRoute ? convertPath(location.pathname, true) : location.pathname
  const search = publicRoute ? convertSearch(true) : location.search
  if (pathname !== location.pathname || search !== location.search) return <Navigate replace to={{ pathname, search, hash: location.hash }} state={location.state} />
  const internal = publicRoute ? { ...location, pathname: convertPath(location.pathname, false), search: convertSearch(false) } : location
  return <Routes location={internal}>{children}</Routes>
}
