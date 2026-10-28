import { Link } from 'react-router-dom'

export function PremiumContentModal({ open, onClose, title = 'Nội dung Premium', next, authenticated = true }: {
  open: boolean
  onClose: () => void
  title?: string
  next?: string
  authenticated?: boolean
}) {
  if (!open) return null
  const destination = authenticated
    ? `/pricing?${new URLSearchParams({ next: next || window.location.pathname + window.location.search })}`
    : `/login?${new URLSearchParams({ returnTo: next || window.location.pathname + window.location.search })}`
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="presentation" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="premium-content-title" className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-6 text-slate-900 shadow-2xl" onClick={event => event.stopPropagation()}>
      <h2 id="premium-content-title" className="text-xl font-bold">{authenticated ? title : 'Đăng nhập để tiếp tục'}</h2>
      <p className="mt-3 text-sm text-slate-600">{authenticated ? 'Nâng cấp Premium để mở nội dung này và quay lại trải nghiệm.' : 'Hãy đăng nhập để sử dụng nội dung miễn phí có tiến độ.'}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2">Để sau</button>
        <Link to={destination} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">{authenticated ? 'Xem gói Premium' : 'Đăng nhập'}</Link>
      </div>
    </div>
  </div>
}
