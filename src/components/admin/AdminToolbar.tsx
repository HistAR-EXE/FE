import type { FormEvent, ReactNode } from 'react'

type AdminToolbarProps = {
  label: string
  children: ReactNode
  actions?: ReactNode
  onSubmit?: () => void
}

export function AdminToolbar({ label, children, actions, onSubmit }: AdminToolbarProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit?.()
  }
  return (
    <form aria-label={label} onSubmit={submit} className="ops-card flex flex-wrap items-end gap-3 p-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </form>
  )
}
