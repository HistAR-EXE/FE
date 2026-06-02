import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastInput, type ToastType } from './toast-context'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'

type ToastItem = {
  id: string
  message: string
  type: ToastType
  closing?: boolean
}

function typeClass(type: ToastType) {
  if (type === 'success') return 'border-secondary bg-secondary/10 text-secondary'
  if (type === 'info') return 'border-primary bg-primary/10 text-primary'
  return 'border-error bg-error/10 text-error'
}

function typeIcon(type: ToastType) {
  if (type === 'success') return 'check_circle'
  if (type === 'info') return 'info'
  return 'error'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)))
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 220)
  }, [])

  const showToast = useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const type = input.type ?? 'error'
    const durationMs = input.durationMs ?? 4000

    setToasts((prev) => [...prev, { id, message: input.message, type }])
    window.setTimeout(() => {
      closeToast(id)
    }, durationMs)
  }, [closeToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] w-[min(92vw,420px)] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border px-4 py-3 shadow-lg backdrop-blur flex items-start gap-3 ${
              toast.closing ? 'toast-exit' : 'toast-enter'
            } ${typeClass(toast.type)}`}
          >
            <MaterialIcon name={typeIcon(toast.type)} className="text-[20px] mt-0.5 shrink-0" filled />
            <p className="flex-1 text-sm leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => closeToast(toast.id)}
              className="rounded p-0.5 hover:bg-surface-variant/20 transition-colors"
              aria-label="Close toast"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

