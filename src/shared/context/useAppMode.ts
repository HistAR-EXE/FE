// src/shared/context/useAppMode.ts
import { useContext } from 'react'
import { AppModeContext } from './modeContext'

export function useAppMode() {
  const ctx = useContext(AppModeContext)
  if (!ctx) {
    throw new Error('useAppMode must be used within AppModeProvider')
  }
  return ctx
}
