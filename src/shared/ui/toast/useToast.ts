// src/shared/ui/toast/useToast.ts
import { useContext } from 'react'
import { ToastContext } from './toast-context'

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return value
}

