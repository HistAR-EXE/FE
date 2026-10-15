import { MaterialIcon } from '../ui/MaterialIcon'

export function AdminLoading({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((row) => (
        <AdminSkeleton key={row} className="h-12" />
      ))}
    </div>
  )
}

export function AdminSkeleton({ className = 'h-12' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} />
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="ops-card border-error/40 bg-error-container/40 p-5 text-on-error-container">
      <div className="flex items-start gap-3">
        <MaterialIcon name="error" className="mt-0.5 text-xl text-error" />
        <div>
          <p className="font-bold text-on-surface">Không tải được dữ liệu</p>
          <p className="mt-1 text-sm text-on-surface-variant">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-bold text-primary hover:bg-surface-container-high"
          >
            Thử lại
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminEmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="ops-card border-dashed p-8 text-center">
      <MaterialIcon name="inbox" className="text-3xl text-outline" />
      <p className="mt-2 font-bold text-on-surface">{title}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{detail}</p>
    </div>
  )
}
