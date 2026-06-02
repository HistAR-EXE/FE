import { createContext } from 'react'

export type ToastType = 'error' | 'success' | 'info'

export type ToastInput = {
  message: string
  type?: ToastType
  durationMs?: number
}

export type ToastContextValue = {
  showToast: (input: ToastInput) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

