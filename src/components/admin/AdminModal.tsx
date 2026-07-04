import type { ReactNode } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'

type AdminModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function AdminModal({ title, onClose, children, wide }: AdminModalProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-md bg-black/60"
      onClick={onClose}
    >
      <div
        className={`glass-panel w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-xl border border-outline-variant p-md pointer-events-auto`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-title-md text-on-surface">{title}</h2>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <MaterialIcon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
