import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminErrorState, AdminLoading } from '../components/admin/AdminAsyncState'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { adminApi, type AdminDashboardSummary } from '../features/admin/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminApi.dashboardSummary().then(setSummary).catch((cause) => {
      setSummary(null)
      setError(getFriendlyErrorMessage(cause, 'quest'))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => load(), [load])

  const cards = summary ? [
    { label: 'Pilot đang active', value: summary.activePilots, icon: 'rocket_launch', to: '/admin/narrative-pilots?rolloutState=ACTIVE', detail: 'Mở danh sách rollout đang chạy' },
    { label: 'Draft / review pending', value: summary.draftCount + summary.reviewPendingCount, icon: 'rate_review', to: '/admin/narrative-pilots?reviewStatus=DRAFT', detail: 'Xử lý hàng đợi nội dung' },
    { label: 'Tổng bản ghi trong Trash', value: summary.trashCount, icon: 'restore_from_trash', to: '/admin/trash', detail: 'Kiểm tra hoặc khôi phục' },
    { label: 'Báo sai sử liệu · 30 ngày', value: summary.contentReportsLast30Days, icon: 'report_problem', to: '/admin/content?tab=reports', detail: 'Mở queue báo cáo nội dung' },
  ] : []

  return (
    <section className="w-full max-w-6xl" aria-busy={loading}>
      {loading && <AdminLoading label="Đang tải KPI vận hành" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.label} to={card.to} className="group rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              <div className="flex items-start justify-between gap-3"><MaterialIcon name={card.icon} className="text-2xl text-amber-700" /><MaterialIcon name="arrow_forward" className="text-lg text-slate-400 transition-transform group-hover:translate-x-1" /></div>
              <p className="mt-5 text-sm font-bold text-slate-700">{card.label}</p>
              <p className="mt-1 text-3xl font-black text-slate-950 tabular-nums">{card.value}</p>
              <p className="mt-2 text-xs text-slate-600">{card.detail}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
