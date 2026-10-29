import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'

export function AdminInfoHint({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span
      ref={root}
      className="admin-billing-info"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!root.current?.contains(document.activeElement)) setOpen(false) }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
    >
      <button
        type="button"
        aria-label={`Thông tin về ${label}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      >
        <MaterialIcon name="info" className="text-[14px]" />
      </button>
      {open && <span id={id} role="tooltip" className="admin-billing-info-popover">{children}</span>}
    </span>
  )
}
