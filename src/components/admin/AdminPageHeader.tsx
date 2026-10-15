import type { ReactNode } from 'react'

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex min-w-0 flex-col gap-4 pt-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {eyebrow && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-2 w-2 shrink-0 animate-ping rounded-full bg-primary" />
            <span className="truncate font-label-sm text-label-sm uppercase tracking-wider text-primary">{eyebrow}</span>
          </div>
        )}
        <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-surface">{title}</h1>
        {description && (
          <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">{description}</p>
        )}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3 lg:justify-end">{actions}</div>}
    </header>
  )
}
