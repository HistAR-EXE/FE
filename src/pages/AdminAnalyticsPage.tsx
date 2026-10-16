import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { adminApi, type AdminAnalyticsOverview, type PilotKpi, type ReferralStatsItem } from '../features/admin/api'
import { createLatestRequestGuard, formatSuppressedCount, formatSuppressedMetric } from '../features/admin/state'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'

function Metric({ label, value, suppressed }: { label: string; value: number | null | undefined; suppressed?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950 tabular-nums">{formatSuppressedMetric(value, suppressed)}</p>
    </div>
  )
}

function BarList({ items }: { items: Array<{ key: string; label: string; value: number; pct: number; suppressed?: boolean }> }) {
  const visible = items.filter((item) => !item.suppressed)
  const max = Math.max(...visible.map((item) => item.value), 1)
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{item.suppressed ? 'Ẩn (<10 mẫu)' : `${item.value} · ${item.pct}%`}</span>
          </div>
          {!item.suppressed && <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (item.value / max) * 100)}%` }} /></div>}
        </div>
      ))}
    </div>
  )
}

export function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null)
  const [pilotKpi, setPilotKpi] = useState<PilotKpi | null>(null)
  const [referralStats, setReferralStats] = useState<ReferralStatsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestGuard = useRef(createLatestRequestGuard())

  const load = useCallback(() => {
    const request = requestGuard.current.begin()
    setLoading(true)
    setError(null)
    Promise.all([
      adminApi.analyticsOverview(CU_CHI_LOCATION_ID),
      adminApi.pilotKpi(),
      adminApi.referralStats(30),
    ])
      .then(([nextOverview, nextPilotKpi, nextReferralStats]) => {
        if (!request.isLatest()) return
        setOverview(nextOverview)
        setPilotKpi(nextPilotKpi)
        setReferralStats(nextReferralStats)
      })
      .catch((cause) => {
        if (!request.isLatest()) return
        setOverview(null)
        setPilotKpi(null)
        setReferralStats([])
        setError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => { if (request.isLatest()) setLoading(false) })
  }, [])

  useEffect(() => {
    load()
    return () => requestGuard.current.invalidate()
  }, [load])

  const empty = overview
    ? overview.poiUnlockRates.every((item) => item.suppressed || (item.unlockCount ?? 0) === 0) &&
      overview.questFunnel.every((item) => item.suppressed || (item.started ?? 0) === 0) &&
      (pilotKpi?.suppressed || Object.values(pilotKpi?.byEventType ?? {}).every((value) => value === 0))
    : true

  return (
    <section className="w-full max-w-6xl space-y-6" aria-busy={loading}>
      <p className="text-sm text-slate-600">Số liệu vận hành aggregate; nhóm có mẫu số dưới 10 được ẩn để bảo vệ riêng tư.</p>
      {loading && <AdminLoading label="Đang tải analytics" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && empty && <AdminEmptyState title="Chưa có dữ liệu phân tích" detail="Chưa ghi nhận đủ phiên thăm quan để hiển thị số liệu aggregate." />}

      {!loading && !error && overview && !empty && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số tổng quan">
            <Metric label="Khám phá trực tuyến" value={overview.onlineToOnsite.usersWithDiscovery} suppressed={overview.onlineToOnsite.suppressed} />
            <Metric label="Check-in tại chỗ" value={overview.onlineToOnsite.usersWithCheckin} suppressed={overview.onlineToOnsite.suppressed} />
            <Metric label="Tỷ lệ online → onsite" value={overview.onlineToOnsite.conversionRatePct} suppressed={overview.onlineToOnsite.suppressed} />
            <Metric label="Quest hoàn thành" value={overview.questCompletedCount} suppressed={overview.questCompletedSuppressed} />
          </section>

          {pilotKpi && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-slate-950">Pilot KPI · 7 ngày</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Session bắt đầu" value={pilotKpi.sessionStart} suppressed={pilotKpi.suppressed || (pilotKpi.sessionStart ?? 0) < 10} />
                <Metric label="Đến trạm" value={pilotKpi.stationArrived} suppressed={pilotKpi.suppressed || (pilotKpi.stationArrived ?? 0) < 10} />
                <Metric label="Check-in" value={pilotKpi.checkinsLast7Days} suppressed={pilotKpi.suppressed || (pilotKpi.checkinsLast7Days ?? 0) < 10} />
                <Metric label="Báo sai sử liệu" value={pilotKpi.byEventType?.content_report} suppressed={pilotKpi.suppressed || (pilotKpi.byEventType?.content_report ?? 0) < 10} />
              </div>
            </section>
          )}

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-950"><MaterialIcon name="place" className="text-amber-700" /> Tỷ lệ mở khóa POI</h2>
              {overview.poiUnlockRates.length === 0 ? <p className="text-sm text-slate-600">Chưa có POI.</p> : (
                <BarList items={overview.poiUnlockRates.map((item) => ({ key: item.unlockKey, label: item.name, value: item.unlockCount ?? 0, pct: item.unlockRatePct ?? 0, suppressed: item.suppressed }))} />
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-950"><MaterialIcon name="assignment" className="text-amber-700" /> Phễu nhiệm vụ</h2>
              {overview.questFunnel.length === 0 ? <p className="text-sm text-slate-600">Chưa có nhiệm vụ.</p> : (
                <BarList items={overview.questFunnel.map((item) => ({ key: item.questId, label: item.title, value: item.completed ?? 0, pct: item.completionRatePct ?? 0, suppressed: item.suppressed }))} />
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-950">Creator referral · 30 ngày</h2>
            {referralStats.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa có referral.</p> : (
              <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-100"><tr>{['Code', 'Creator', 'Visits', 'Sessions', 'Users'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>
                {referralStats.map((item) => <tr key={item.code} className="border-t border-slate-200"><td className="p-3 font-mono">/{item.code}</td><td className="p-3">{item.creatorName}</td><td className="p-3">{formatSuppressedCount(item.visits, item.suppressed)}</td><td className="p-3">{formatSuppressedCount(item.uniqueSessions, item.suppressed)}</td><td className="p-3">{formatSuppressedCount(item.uniqueUsers, item.suppressed)}</td></tr>)}
              </tbody></table></div>
            )}
          </section>

          {overview.journeyNote && <p className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-700">{overview.journeyNote}</p>}
        </>
      )}
    </section>
  )
}
