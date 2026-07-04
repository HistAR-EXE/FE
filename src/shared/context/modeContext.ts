// src/shared/context/modeContext.ts
import { createContext } from 'react'

export type AppMode = 'online' | 'offline'

export type AppModeContextValue = {
  mode: AppMode | null
  setMode: (mode: AppMode) => void
  toggleMode: () => void
  clearMode: () => void
}

export const AppModeContext = createContext<AppModeContextValue | null>(null)
