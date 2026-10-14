import { MaterialIcon } from '../ui/MaterialIcon'

export function AdminLoading({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-12 animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  )
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
      <div className="flex items-start gap-3">
        <MaterialIcon name="error" className="mt-0.5 text-xl" />
        <div>
          <p className="font-bold">Không tải được dữ liệu</p>
          <p className="mt-1 text-sm">{message}</p>
          <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold hover:bg-red-100">
            Thử lại
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminEmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <MaterialIcon name="inbox" className="text-3xl text-slate-400" />
      <p className="mt-2 font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  )
}
