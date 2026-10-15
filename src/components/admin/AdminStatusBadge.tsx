import type { ReactNode } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'

type AdminStatusBadgeProps = {
  label: string
  icon: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  detail?: ReactNode
}

const toneClasses = {
  neutral: 'border-outline-variant bg-surface-container-high text-on-surface-variant',
  success: 'border-primary/30 bg-primary-container/20 text-primary',
  warning: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
  danger: 'border-error/40 bg-error-container/40 text-error',
} as const

export function AdminStatusBadge({ label, icon, tone = 'neutral', detail }: AdminStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${toneClasses[tone]}`}>
      <span aria-hidden="true"><MaterialIcon name={icon} className="text-sm" /></span>
      <span>{label}</span>
      {detail && <span className="font-medium">{detail}</span>}
    </span>
  )
}
