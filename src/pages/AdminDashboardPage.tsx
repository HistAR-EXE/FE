import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { adminApi, type NarrativePilotAdmin } from '../features/admin/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

export function AdminDashboardPage() {
  const { showToast } = useToast()
  const [pilots, setPilots] = useState<NarrativePilotAdmin[]>([])

  useEffect(() => {
    adminApi.listNarrativePilots().then(setPilots).catch((error) => {
      showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
    })
  }, [showToast])

  const reviewCount = pilots.filter((pilot) => pilot.reviewStatus !== 'APPROVED').length
  const activeCount = pilots.filter((pilot) => pilot.enabled).length
  const cards = [
    ['Narrative cần review', String(reviewCount), reviewCount ? 'Có nội dung cần xử lý' : 'Không có queue tồn đọng', 'rate_review', 'amber'],
    ['Pilot đang active', String(activeCount), 'Đọc từ rollout state', 'rocket_launch', 'emerald'],
    ['Campaign cần quyết định', '—', 'Chưa nối campaign queue', 'event_upcoming', 'sky'],
    ['Báo sai liệu quá SLA', '—', 'Chưa nối content-report queue', 'report_problem', 'rose'],
  ] as const

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, hint, icon, tone]) => (
            <article key={label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full blur-2xl ${tone === 'amber' ? 'bg-amber-200/60' : tone === 'emerald' ? 'bg-emerald-200/60' : tone === 'rose' ? 'bg-rose-200/60' : 'bg-sky-200/60'}`} />
            <MaterialIcon name={icon} className="mb-5 text-2xl text-amber-600" />
            <p className="text-sm font-bold text-slate-600">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
            <p className="mt-2 text-xs text-slate-500">{hint}</p>
          </article>
        ))}
      </section>
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3"><h2 className="font-black text-slate-950">Hành động ưu tiên</h2><MaterialIcon name="priority_high" className="text-amber-600" /></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Duyệt graph, xem checklist readiness và bật pilot khi đủ điều kiện.</p>
          <Link to="/admin/narrative-pilots" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400"><MaterialIcon name="account_tree" /> Mở Narrative pilots</Link>
        </article>
        <article className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6">
          <h2 className="font-black text-amber-900">Điều kiện bảo vệ</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700"><li>• Feature flag chỉ bật trong deployment config.</li><li>• Review và rollout phải qua gate readiness.</li><li>• Không hiển thị raw chat hoặc memory học sinh.</li></ul>
        </article>
      </section>
    </>
  )
}
