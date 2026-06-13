import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { visitSessionsApi } from './api'
import { readAppMode } from '../../shared/context/AppModeProvider'
import { useAuth } from '../../shared/auth/useAuth'

type VisitSessionContextValue = {
  endSessionForLocation: (locationId: string) => void
  getSessionId: (locationId: string) => string | undefined
  markStarted: (locationId: string) => boolean
  setSessionId: (locationId: string, sessionId: string) => void
  clearStarted: (locationId: string) => void
}

const VisitSessionContext = createContext<VisitSessionContextValue | null>(null)

export function VisitSessionProvider({ children }: { children: ReactNode }) {
  const startedRef = useRef<Set<string>>(new Set())
  const sessionIdsRef = useRef<Map<string, string>>(new Map())

  const endSessionForLocation = useCallback((locationId: string) => {
    const id = sessionIdsRef.current.get(locationId)
    if (!id) return
    sessionIdsRef.current.delete(locationId)
    startedRef.current.delete(locationId)
    void visitSessionsApi.end(id, 'USER_EXIT').catch(() => {})
  }, [])

  const value = useMemo<VisitSessionContextValue>(
    () => ({
      endSessionForLocation,
      getSessionId: (locationId) => sessionIdsRef.current.get(locationId),
      markStarted: (locationId) => {
        if (startedRef.current.has(locationId)) return false
        startedRef.current.add(locationId)
        return true
      },
      setSessionId: (locationId, sessionId) => {
        sessionIdsRef.current.set(locationId, sessionId)
      },
      clearStarted: (locationId) => {
        startedRef.current.delete(locationId)
      },
    }),
    [endSessionForLocation],
  )

  return <VisitSessionContext.Provider value={value}>{children}</VisitSessionContext.Provider>
}

export function useVisitSessionForLocation(locationId: string | undefined, enabled: boolean) {
  const ctx = useContext(VisitSessionContext)
  const { isAuthenticated } = useAuth()

  const endSession = useCallback(() => {
    if (!locationId || !ctx) return
    ctx.endSessionForLocation(locationId)
  }, [ctx, locationId])

  useEffect(() => {
    if (!ctx || !locationId || !enabled || !isAuthenticated) return
    if (!ctx.markStarted(locationId)) return

    const mode = readAppMode() === 'offline' ? 'offline' : 'online'
    visitSessionsApi
      .start(locationId, mode)
      .then((res) => {
        ctx.setSessionId(locationId, res.id)
      })
      .catch(() => {
        ctx.clearStarted(locationId)
      })

    const onHide = () => endSession()
    window.addEventListener('pagehide', onHide)

    return () => {
      window.removeEventListener('pagehide', onHide)
      endSession()
    }
  }, [ctx, enabled, endSession, isAuthenticated, locationId])

  return { endSession }
}
