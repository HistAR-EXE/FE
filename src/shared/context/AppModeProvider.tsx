import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AppModeContext, type AppMode } from './modeContext'

const STORAGE_KEY = 'timelens_mode'

function readStoredMode(): AppMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'online' || raw === 'offline') return raw
  } catch {
    /* ignore */
  }
  return null
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode | null>(readStoredMode)

  const setMode = useCallback((next: AppMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const clearMode = useCallback(() => {
    setModeState(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next: AppMode = current === 'online' ? 'offline' : 'online'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ mode, setMode, toggleMode, clearMode }),
    [mode, setMode, toggleMode, clearMode],
  )

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
}

export type { AppMode } from './modeContext'
