import { useEffect, useId, useRef, type ReactNode } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'

type AdminModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function AdminModal({ title, onClose, children, wide }: AdminModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
    focusable()[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previouslyFocused?.focus() }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-md bg-black/60"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-md text-slate-900 shadow-xl pointer-events-auto`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between mb-md">
          <h2 id={titleId} className="font-title-md text-slate-950">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng hộp thoại" className="rounded text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            <MaterialIcon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
