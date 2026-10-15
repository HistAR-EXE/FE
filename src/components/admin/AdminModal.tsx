import { useEffect, useId, useRef, type ReactNode } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'

type AdminModalProps = {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  /** Icon next to title (Material Symbol name) */
  icon?: string
}

export function AdminModal({ title, subtitle, onClose, children, wide, icon }: AdminModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    const inerted: Array<{ element: HTMLElement; wasInert: boolean }> = []
    let branch: HTMLElement | null = overlayRef.current
    while (branch?.parentElement && branch.parentElement !== document.body) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          inerted.push({ element: sibling, wasInert: sibling.hasAttribute('inert') })
          sibling.setAttribute('inert', '')
        }
      }
      branch = branch.parentElement
    }
    document.body.style.overflow = 'hidden'
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
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      inerted.forEach(({ element, wasInert }) => { if (!wasInert) element.removeAttribute('inert') })
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className={`pointer-events-auto flex max-h-[min(90vh,44rem)] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low text-on-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] ${wide ? 'max-w-xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/50 bg-surface-container px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
                <MaterialIcon name={icon} className="text-[20px]" />
              </div>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="font-headline-md text-headline-md font-semibold leading-tight text-on-surface">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 font-code-sm text-code-sm text-outline">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="shrink-0 rounded-lg p-1.5 text-outline hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
