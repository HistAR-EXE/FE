import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminEmptyState, AdminErrorState, AdminLoading } from '../components/admin/AdminAsyncState'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import {
  adminApi,
  type ActivityHeatmap,
  type ActivitySeries,
  type AdminAnalyticsOverview,
  type PilotKpi,
} from '../features/admin/api'
import { locationsApi, type Location } from '../features/locations/api'
import { formatSuppressedMetric } from '../features/admin/state'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

const RANGE_OPTIONS = [
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
  { id: '90d', label: '90 ngày' },
] as const

const btnGhost =
  'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-surface-container-high px-3 font-headline-sm text-sm text-on-surface hover:bg-surface-container-highest disabled:opacity-50'
const btnPrimary =
  'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-container px-3 font-headline-sm text-sm font-bold text-on-primary-container hover:opacity-95 disabled:opacity-50'
const selectClass =
  'rounded-lg border-0 bg-surface-container-high px-3 py-1.5 pr-8 font-headline-sm text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary'

const formatCount = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('vi-VN') : '—'

const formatPct = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '—'

const privacyCopy = (suppressed?: boolean) =>
  suppressed ? 'Ẩn để bảo vệ riêng tư (dưới ngưỡng mẫu tối thiểu).' : null

function sparkPath(values: number[]) {
  if (values.length < 2) return 'M0 18 L100 18'
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 22 - ((v - min) / span) * 18
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function dwellLabel(avgDwellMs: number | null | undefined) {
  if (typeof avgDwellMs !== 'number' || !Number.isFinite(avgDwellMs) || avgDwellMs <= 0) return '—'
  const minutes = avgDwellMs / 60_000
  if (minutes < 1) return `${Math.round(avgDwellMs / 1000)}s`
  return `${minutes.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} phút`
}

function attractionMeta(ratePct: number | null | undefined, hotspot?: boolean | null) {
  if (hotspot) {
    return { label: 'Cần chú ý', className: 'bg-error/15 text-error' }
  }
  if (typeof ratePct !== 'number') {
    return { label: 'Ẩn', className: 'bg-surface-container-highest text-on-surface-variant' }
  }
  if (ratePct >= 70) return { label: 'Rất cao', className: 'bg-primary-container/20 text-primary' }
  if (ratePct >= 40) return { label: 'Giữ chân sâu', className: 'bg-secondary/15 text-secondary' }
  return { label: 'Ổn định', className: 'bg-surface-container-highest text-on-surface-variant' }
}

function exportAnalyticsCsv(overview: AdminAnalyticsOverview, locationName: string, range: string) {
  const lines = [
    ['section', 'key', 'value'],
    ['meta', 'location', locationName],
    ['meta', 'range', range],
    ['kpi', 'activeUsers', String(overview.activeUsers ?? '')],
    ['kpi', 'eventCount', String(overview.eventCount ?? '')],
    ['kpi', 'questCompletedCount', String(overview.questCompletedCount ?? '')],
    ['kpi', 'conversionRatePct', String(overview.onlineToOnsite.conversionRatePct ?? '')],
    ...overview.questFunnel.map((item) => [
      'questFunnel',
      item.title,
      String(item.completed ?? ''),
    ]),
    ...overview.journeyDropOff.map((item) => [
      'dropOff',
      item.poiName,
      String(item.dropOffPct ?? ''),
    ]),
    ...overview.poiUnlockRates.map((item) => [
      'poiUnlock',
      item.name,
      String(item.unlockCount ?? ''),
    ]),
  ]
  const blob = new Blob([lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `histar-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AdminAnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const locationId = params.get('locationId') ?? ''
  const range = params.get('range') ?? '30d'
  const [locations, setLocations] = useState<Location[]>([])
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null)
  const [activity, setActivity] = useState<PilotKpi | null>(null)
  const [series, setSeries] = useState<ActivitySeries | null>(null)
  const [heatmap, setHeatmap] = useState<ActivityHeatmap | null>(null)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [heatmapError, setHeatmapError] = useState<string | null>(null)
  const [bootLoading, setBootLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const { showToast } = useToast()

  const update = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })

  useEffect(() => {
    locationsApi
      .list({ size: 100 })
      .then((items) => {
        setLocations(items)
        if (!locationId && items[0]) update('locationId', items[0].id)
      })
      .catch(() => setLocations([]))
  }, [])

  const load = useCallback(async () => {
    if (!locationId) {
      setBootLoading(false)
      return
    }
    setRefreshing(true)
    setOverviewError(null)
    setActivityError(null)
    setHeatmapError(null)
    const [overviewResult, activityResult, seriesResult, heatmapResult] = await Promise.allSettled([
      adminApi.analyticsOverview(locationId, range),
      adminApi.pilotKpi(),
      adminApi.analyticsActivitySeries(locationId, range, 'DAY'),
      adminApi.analyticsActivityHeatmap(locationId, range),
    ])
    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value)
    else {
      setOverview(null)
      setOverviewError(getFriendlyErrorMessage(overviewResult.reason, 'quest'))
    }
    if (activityResult.status === 'fulfilled') setActivity(activityResult.value)
    else {
      setActivity(null)
      setActivityError(getFriendlyErrorMessage(activityResult.reason, 'quest'))
    }
    if (seriesResult.status === 'fulfilled') setSeries(seriesResult.value)
    else setSeries(null)
    if (heatmapResult.status === 'fulfilled') setHeatmap(heatmapResult.value)
    else {
      setHeatmap(null)
      setHeatmapError(getFriendlyErrorMessage(heatmapResult.reason, 'quest'))
    }
    setSyncedAt(new Date().toLocaleTimeString('vi-VN'))
    setBootLoading(false)
    setRefreshing(false)
  }, [locationId, range])

  useEffect(() => {
    void load()
  }, [load])

  const selectedLocation = locations.find((item) => item.id === locationId)
  const locationName = selectedLocation?.name ?? 'Địa điểm'

  const journeyCompletionPct = useMemo(() => {
    const rates = (overview?.questFunnel ?? [])
      .map((item) => item.completionRatePct)
      .filter((value): value is number => typeof value === 'number')
    if (!rates.length) return null
    return rates.reduce((sum, value) => sum + value, 0) / rates.length
  }, [overview?.questFunnel])

  const funnelBase = useMemo(() => {
    const rows = overview?.questFunnel ?? []
    const started = rows
      .map((item) => item.started)
      .filter((value): value is number => typeof value === 'number')
    return started.length ? Math.max(...started) : 0
  }, [overview?.questFunnel])

  const sparkValues = useMemo(
    () =>
      (series?.series ?? [])
        .map((point) => point.activeUsers)
        .filter((value): value is number => typeof value === 'number'),
    [series?.series],
  )

  const heatmapGrid = useMemo(() => {
    const days = heatmap?.dayLabels ?? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    const slots =
      heatmap?.slotLabels?.length === 24
        ? heatmap.slotLabels
        : Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
    const byKey = new Map(
      (heatmap?.cells ?? []).map((cell) => [`${cell.dayIndex}-${cell.slotIndex}`, cell] as const),
    )
    return { days, slots, byKey }
  }, [heatmap])

  const topPois = useMemo(() => {
    const heatByKey = new Map((overview?.poiHeatmap ?? []).map((item) => [item.unlockKey, item]))
    return [...(overview?.poiUnlockRates ?? [])]
      .sort((a, b) => (b.unlockCount ?? 0) - (a.unlockCount ?? 0))
      .slice(0, 6)
      .map((item) => {
        const heat = heatByKey.get(item.unlockKey)
        return {
          ...item,
          visitCount: heat?.visitCount ?? null,
          avgDwellMs: heat?.avgDwellMs ?? null,
          dropOffHotspot: heat?.dropOffHotspot ?? false,
        }
      })
  }, [overview?.poiHeatmap, overview?.poiUnlockRates])

  const dropRows = useMemo(
    () =>
      [...(overview?.journeyDropOff ?? [])]
        .filter((item) => !item.suppressed)
        .sort((a, b) => (b.dropOffPct ?? 0) - (a.dropOffPct ?? 0))
        .slice(0, 4),
    [overview?.journeyDropOff],
  )

  const acquisitionRows = useMemo(() => {
    if (!activity || activity.suppressed) return []
    const entries = [
      { key: 'landing_visit', label: 'Landing / web', icon: 'public', tone: 'primary' as const },
      { key: 'pack_loaded', label: 'Tải trải nghiệm AR', icon: 'view_in_ar', tone: 'secondary' as const },
      { key: 'share_initiated', label: 'Chia sẻ / social', icon: 'share', tone: 'tertiary' as const },
      { key: 'checkin_result', label: 'Check-in tại chỗ', icon: 'pin_drop', tone: 'outline' as const },
    ]
    const total = entries.reduce((sum, row) => sum + (activity.byEventType?.[row.key] ?? 0), 0)
    if (total < 10) return []
    return entries
      .map((row) => {
        const count = activity.byEventType?.[row.key] ?? 0
        return { ...row, count, pct: total ? (count * 100) / total : 0 }
      })
      .filter((row) => row.count > 0)
  }, [activity])

  return (
    <section className="admin-page flex w-full max-w-7xl flex-col pb-16" aria-busy={bootLoading || refreshing}>
      <div className="admin-page-header flex flex-col gap-space-md py-space-lg">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2">
            <span className="font-code-sm text-code-sm uppercase tracking-wider text-outline">QUẢN TRỊ</span>
            <span className="text-xs text-outline">/</span>
            <span className="font-code-sm text-code-sm uppercase tracking-wider text-outline">GIÁM SÁT</span>
            <span className="text-xs text-outline">/</span>
            <span className="font-label-sm text-label-sm font-semibold uppercase text-primary">
              PHÂN TÍCH CHUYÊN SÂU
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-surface-container px-2.5 py-1 text-on-surface-variant">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
            <span className="font-code-sm text-code-sm">Đang theo dõi số liệu</span>
            {syncedAt && (
              <>
                <span className="text-xs text-outline">•</span>
                <span className="font-code-sm text-code-sm text-outline">Đồng bộ lúc: {syncedAt}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-space-lg xl:flex-row xl:items-end">
          <div className="max-w-3xl space-y-1.5">
            <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
              Phân tích số liệu di tích &amp; Trải nghiệm du khách
            </h1>
            <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
              Hệ thống theo dõi hoạt động thực tế, phân tích hành trình từ trải nghiệm trực tuyến đến tham quan tại di tích và mức độ hoàn
              thành nhiệm vụ AR và chất lượng phiên trải nghiệm. Số liệu dưới ngưỡng riêng tư được ẩn thay vì hiện 0.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <button
              type="button"
              className={btnGhost}
              disabled={!overview}
              onClick={() => {
                if (!overview) return
                exportAnalyticsCsv(overview, locationName, range)
                showToast({ message: 'Đã xuất CSV từ số liệu đang xem.', type: 'success' })
              }}
            >
              <MaterialIcon name="download" className="text-[18px] text-primary" />
              Xuất báo cáo số liệu
            </button>
            <button type="button" className={btnPrimary} disabled={refreshing || !locationId} onClick={() => void load()}>
              <MaterialIcon name="sync" className={`text-[18px] ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới dữ liệu
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-md">
          <div className="flex flex-wrap items-center gap-space-sm">
            <MaterialIcon name="museum" className="text-[18px] text-outline" />
            <label className="sr-only" htmlFor="analytics-location">
              Địa điểm
            </label>
            <select
              id="analytics-location"
              value={locationId}
              onChange={(event) => update('locationId', event.target.value)}
              className={selectClass}
            >
              <option value="" disabled>Chọn địa điểm</option>
              {locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {locationId && (
              <span className="hidden px-2 font-code-sm text-code-sm text-outline sm:inline">
                ID: {locationId.slice(0, 8).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-surface-container-low p-1" role="group" aria-label="Khoảng thời gian">
            {RANGE_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => update('range', item.id)}
                className={`cursor-pointer rounded px-3 py-1 font-label-sm text-label-sm transition-colors ${
                  range === item.id
                    ? 'bg-primary-container font-semibold text-on-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {bootLoading && <AdminLoading label="Đang tải phân tích" />}

      {!bootLoading && !locationId && (
        <AdminEmptyState title="Chưa chọn địa điểm" detail="Chọn địa điểm để tải số liệu phân tích." />
      )}

      {!bootLoading && locationId && (
        <>
          {/* KPI */}
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-sm transition-all hover:bg-surface-container">
              <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
              <div className="flex items-center justify-between">
                <span className="font-body-md text-body-md text-on-surface-variant">Tổng du khách kích hoạt AR</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary">
                  <MaterialIcon name="view_in_ar" className="text-[18px]" />
                </div>
              </div>
              <div className="my-3">
                <div className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
                  {overview?.activitySuppressed
                    ? 'Ẩn'
                    : formatCount(overview?.activeUsers)}
                </div>
                <p className="mt-1 font-code-sm text-code-sm text-outline">
                  {overview?.activitySuppressed
                    ? privacyCopy(true)
                    : `${formatCount(overview?.eventCount)} sự kiện · ${range}`}
                </p>
              </div>
              <div className="h-8 w-full pt-1">
                <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 24">
                  <path
                    d={sparkPath(sparkValues.length ? sparkValues : [0, 0])}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                    className="text-primary"
                  />
                </svg>
              </div>
            </article>

            <article className="flex min-h-[148px] flex-col justify-between rounded-xl bg-surface-container-low p-space-lg shadow-sm transition-all hover:bg-surface-container">
              <div className="flex items-center justify-between">
                <span className="font-body-md text-body-md text-on-surface-variant">Tỷ lệ hoàn tất hành trình</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-secondary">
                  <MaterialIcon name="verified" className="text-[18px]" />
                </div>
              </div>
              <div className="my-3">
                <div className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
                  {formatPct(journeyCompletionPct)}
                </div>
                <p className="mt-1 font-code-sm text-code-sm text-outline">
                  {overview?.questCompletedSuppressed
                    ? privacyCopy(true)
                    : `${formatCount(overview?.questCompletedCount)} nhiệm vụ hoàn tất`}
                </p>
              </div>
              <div className="w-full space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-secondary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, journeyCompletionPct ?? 0))}%` }}
                  />
                </div>
              </div>
            </article>

            <article className="flex min-h-[148px] flex-col justify-between rounded-xl bg-surface-container-low p-space-lg shadow-sm transition-all hover:bg-surface-container">
              <div className="flex items-center justify-between">
                <span className="font-body-md text-body-md text-on-surface-variant">Từ khám phá trực tuyến đến tham quan tại chỗ</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-tertiary">
                  <MaterialIcon name="pin_drop" className="text-[18px]" />
                </div>
              </div>
              <div className="my-3">
                <div className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
                  {overview?.onlineToOnsite.suppressed
                    ? 'Ẩn'
                    : formatPct(overview?.onlineToOnsite.conversionRatePct)}
                </div>
                <p className="mt-1 font-code-sm text-code-sm text-outline">
                  {overview?.onlineToOnsite.suppressed
                    ? privacyCopy(true)
                    : `${formatCount(overview?.onlineToOnsite.usersDiscoveryThenCheckin)} khách khám phá rồi quét mã tại điểm`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { label: 'Khám phá', value: overview?.onlineToOnsite.usersWithDiscovery },
                  { label: 'Quét mã', value: overview?.onlineToOnsite.usersWithCheckin },
                  { label: 'Cả hai', value: overview?.onlineToOnsite.usersDiscoveryThenCheckin },
                ].map((cell) => (
                  <div key={cell.label} className="flex-1 rounded bg-surface-container-high p-1 text-center">
                    <div className="font-code-sm text-[10px] text-outline">{cell.label}</div>
                    <div className="font-label-sm text-label-sm font-semibold text-on-surface">
                      {overview?.onlineToOnsite.suppressed ? '—' : formatCount(cell.value)}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="flex min-h-[148px] flex-col justify-between rounded-xl bg-surface-container-low p-space-lg shadow-sm transition-all hover:bg-surface-container">
              <div className="flex items-center justify-between">
                <span className="font-body-md text-body-md text-on-surface-variant">Chất lượng phiên</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary">
                  <MaterialIcon name="star" className="text-[18px]" />
                </div>
              </div>
              <div className="my-3 flex items-baseline gap-2">
                <span className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
                  {overview?.sessionQuality.suppressed
                    ? 'Ẩn'
                    : formatSuppressedMetric(overview?.sessionQuality.avgDurationMinutes, false)}
                </span>
                {!overview?.sessionQuality.suppressed && (
                  <span className="font-body-sm text-body-sm text-outline">phút / phiên</span>
                )}
              </div>
              <p className="font-code-sm text-code-sm text-outline">
                {overview?.sessionQuality.suppressed
                  ? privacyCopy(true)
                  : `${formatSuppressedMetric(overview?.sessionQuality.avgDiscoveriesPerSession, false)} lượt khám phá/phiên · ${formatCount(activity?.npsSubmitted)} lượt đánh giá`}
              </p>
            </article>
          </div>

          {/* Funnel + Drop-off */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section
              className="flex flex-col rounded-xl bg-surface-container-low p-space-lg shadow-sm lg:col-span-8"
              aria-labelledby="analytics-Phễu nhiệm vụ"
            >
              <div className="mb-space-md flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <h2 id="analytics-Phễu nhiệm vụ" className="font-headline-sm text-headline-sm text-on-surface">
                    Tiến độ hoàn thành nhiệm vụ
                  </h2>
                </div>
                <span className="font-code-sm text-code-sm text-outline">
                  {(overview?.questFunnel.length ?? 0).toLocaleString('vi-VN')} nhiệm vụ
                </span>
              </div>
              {overviewError ? (
                <AdminErrorState message={overviewError} onRetry={() => void load()} />
              ) : !(overview?.questFunnel.length) ? (
                <AdminEmptyState title="Chưa có nhiệm vụ" detail="Không có dữ liệu phễu trong khoảng đã chọn." />
              ) : (
                <div className="my-auto space-y-3">
                  {overview.questFunnel.map((item, index) => {
                    const completed = item.suppressed ? null : item.completed
                    const started = item.suppressed ? null : item.started
                    const pctOfBase =
                      !item.suppressed && funnelBase > 0 && typeof started === 'number'
                        ? (started * 100) / funnelBase
                        : item.completionRatePct ?? 0
                    const barWidth = item.suppressed ? 0 : Math.min(100, Math.max(0, pctOfBase))
                    return (
                      <div
                        key={item.questId}
                        className="flex flex-col gap-1.5 rounded-lg bg-surface-container-lowest p-3 transition-transform hover:scale-[1.005]"
                      >
                        <div className="flex items-center justify-between gap-3 text-body-sm">
                          <span className="flex min-w-0 items-center gap-2 font-body-md text-body-md text-on-surface">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container font-code-sm text-[10px] font-bold text-primary">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="truncate">{item.title}</span>
                          </span>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-code-sm text-code-sm font-semibold text-on-surface">
                              {item.suppressed ? 'Ẩn' : formatCount(completed)}
                            </span>
                            <span className="w-14 text-right font-code-sm text-code-sm font-bold text-primary">
                              {item.suppressed ? '—' : formatPct(item.completionRatePct)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${barWidth}%`, opacity: 1 - index * 0.08 }}
                          />
                        </div>
                        {item.suppressed && (
                          <p className="font-code-sm text-code-sm text-outline">{privacyCopy(true)}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section
              className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-lg shadow-sm lg:col-span-4"
              aria-labelledby="analytics-Điểm rời hành trình"
            >
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <MaterialIcon name="warning" className="text-[20px] text-error" />
                  <h2 id="analytics-Điểm rời hành trình" className="font-headline-sm text-headline-sm text-on-surface">
                    Điểm khách dừng hành trình
                  </h2>
                </div>
                <p className="mb-space-md font-body-sm text-body-sm text-on-surface-variant">
                  Các điểm khám phá có nhiều du khách dừng hành trình trong khoảng thời gian đã chọn.
                </p>
                {overviewError ? (
                  <AdminErrorState message={overviewError} onRetry={() => void load()} />
                ) : dropRows.length === 0 ? (
                  <AdminEmptyState title="Chưa có dữ liệu" detail="Chưa đủ lượt tham quan để xác định điểm dừng hành trình." />
                ) : (
                  <div className="space-y-3">
                    {dropRows.map((item, index) => (
                      <div
                        key={`${item.unlockKey}-${item.poiName}`}
                        className={`rounded-lg border-l-2 bg-surface-container-lowest p-space-md ${
                          index === 0 ? 'border-l-error' : 'border-l-tertiary'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-headline-sm text-headline-sm text-on-surface">{item.poiName}</span>
                          <span
                            className={`rounded px-2 py-0.5 font-code-sm text-[11px] font-bold ${
                              index === 0
                                ? 'bg-error-container/30 text-error'
                                : 'bg-tertiary-container/30 text-tertiary'
                            }`}
                          >
                            {typeof item.dropOffPct === 'number'
                              ? `Giảm ${item.dropOffPct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
                              : 'Chưa có tỷ lệ'}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-outline">
                          {formatCount(item.sessionCount)} lượt dừng tại điểm này.
                        </p>
                        <div className="mt-2.5 flex items-center justify-between font-code-sm text-[11px] text-on-surface-variant">
                          <span>Đã tác động: {formatCount(item.sessionCount)} khách</span>
                          <Link to="/admin/content" className="flex items-center gap-0.5 text-primary hover:underline">
                            Xem nội dung
                            <MaterialIcon name="chevron_right" className="text-[12px]" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-primary-container/10 p-3">
                <MaterialIcon name="auto_awesome" className="mt-0.5 shrink-0 text-[18px] text-primary" />
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  <span className="font-semibold text-primary">Gợi ý vận hành: </span>
                  Ưu tiên kiểm tra vị trí và định vị tại những điểm du khách rời hành trình nhiều.
                </p>
              </div>
            </section>
          </div>

          {/* POI table + density */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section
              className="flex flex-col rounded-xl bg-surface-container-low p-space-lg shadow-sm lg:col-span-7"
              aria-labelledby="analytics-top-pois"
            >
              <div className="mb-space-md flex items-center justify-between gap-2">
                <div>
                  <h2 id="analytics-top-pois" className="font-headline-sm text-headline-sm text-on-surface">
                    Điểm di tích được ghi nhận nhiều nhất
                  </h2>
                  <p className="font-code-sm text-code-sm text-outline">Xếp hạng theo lượt mở điểm hợp lệ</p>
                </div>
                <span className="rounded-full bg-surface-container px-2.5 py-1 font-code-sm text-code-sm text-primary">
                  {topPois.length} điểm nổi bật
                </span>
              </div>
              {overviewError ? (
                <AdminErrorState message={overviewError} onRetry={() => void load()} />
              ) : topPois.length === 0 ? (
                <AdminEmptyState title="Chưa có điểm khám phá" detail="Không có lượt mở khóa trong khoảng đã chọn." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-lowest font-label-sm text-label-sm uppercase text-outline">
                        <th className="rounded-l-lg px-3 py-2.5">Tên điểm khám phá</th>
                        <th className="px-3 py-2.5 text-right">Lượt quét AR</th>
                        <th className="px-3 py-2.5 text-right">Dừng trung bình</th>
                        <th className="rounded-r-lg px-3 py-2.5 text-center">Mức hấp dẫn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-highest">
                      {topPois.map((item) => {
                        const badge = attractionMeta(
                          item.suppressed ? null : item.unlockRatePct,
                          item.dropOffHotspot,
                        )
                        return (
                          <tr key={item.unlockKey} className="transition-colors hover:bg-surface-container">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                                  <MaterialIcon name="place" className="text-[18px]" />
                                </div>
                                <div>
                                  <div className="font-headline-sm text-headline-sm text-on-surface">{item.name}</div>
                                  <div className="sr-only">Mã điểm: {item.unlockKey}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-code-sm text-code-sm font-semibold text-on-surface">
                              {item.suppressed ? 'Ẩn' : formatCount(item.unlockCount)}
                            </td>
                            <td className="px-3 py-3 text-right font-code-sm text-code-sm text-primary">
                              {item.suppressed ? '—' : dwellLabel(item.avgDwellMs)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-block rounded px-2 py-0.5 font-label-sm text-[11px] ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="flex flex-col justify-start rounded-xl bg-surface-container-low p-space-lg shadow-sm lg:col-span-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Mật độ theo giờ trong tuần</h2>
                  <p className="font-body-sm text-body-sm text-outline">Mức độ hoạt động trong từng giờ, từ 00:00 đến 23:00</p>
                </div>
                <div className="flex items-center gap-1.5 font-code-sm text-[10px] text-outline">
                  <span>Thấp</span>
                  <div className="h-2.5 w-2.5 rounded-sm bg-surface-container-highest" />
                  <div className="h-2.5 w-2.5 rounded-sm bg-primary/40" />
                  <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  <span>Cao</span>
                </div>
              </div>
              {heatmapError ? (
                <AdminErrorState message={heatmapError} onRetry={() => void load()} />
              ) : (
                <>
                  <div className="mb-3 mt-2 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest p-2">
                      <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                      <div className="flex flex-col">
                        <span className="font-code-sm text-[10px] text-outline">Đỉnh sáng:</span>
                        <span className="font-label-sm text-label-sm font-bold text-primary">
                          {heatmap?.peakMorningLabel ?? '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest p-2">
                      <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                      <div className="flex flex-col">
                        <span className="font-code-sm text-[10px] text-outline">Đỉnh chiều:</span>
                        <span className="font-label-sm text-label-sm font-bold text-primary">
                          {heatmap?.peakAfternoonLabel ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="grid grid-cols-7 pb-0.5 text-center font-code-sm text-[10px] text-outline">
                      {heatmapGrid.days.map((label, dayIndex) => (
                        <span
                          key={label}
                          className={dayIndex >= 5 ? 'font-bold text-primary' : undefined}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    {heatmapGrid.slots.map((slotLabel, slotIndex) => {
                      const peakRow =
                        heatmap?.peakMorningLabel?.startsWith(slotLabel) ||
                        heatmap?.peakAfternoonLabel?.startsWith(slotLabel)
                      return (
                        <div key={slotLabel} className="flex items-center gap-2">
                          <span
                            className={`w-11 shrink-0 font-code-sm text-[10px] ${
                              peakRow ? 'font-semibold text-primary' : 'text-outline'
                            }`}
                          >
                            {slotLabel}
                          </span>
                          <div className="grid flex-1 grid-cols-7 gap-1">
                            {heatmapGrid.days.map((_, dayIndex) => {
                              const cell = heatmapGrid.byKey.get(`${dayIndex}-${slotIndex}`)
                              const intensity = cell?.suppressed ? 0 : (cell?.intensity ?? 0)
                              const tone =
                                intensity <= 0
                                  ? 'bg-surface-container-highest'
                                  : intensity < 0.35
                                    ? 'bg-primary/20'
                                    : intensity < 0.55
                                      ? 'bg-primary/40'
                                      : intensity < 0.75
                                        ? 'bg-primary/60'
                                        : intensity < 0.9
                                          ? 'bg-primary/80'
                                          : 'bg-primary'
                              return (
                                <div
                                  key={`${dayIndex}-${slotIndex}`}
                                  title={
                                    cell?.suppressed
                                      ? privacyCopy(true) ?? 'Ẩn'
                                      : `${formatCount(cell?.activeUsers)} users · ${formatCount(cell?.eventCount)} sự kiện`
                                  }
                                  className={`h-3 rounded-sm ${tone}`}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {!heatmap?.cells.some((cell) => (cell.activeUsers ?? 0) > 0 || cell.intensity > 0) && (
                      <p className="pt-2 font-body-sm text-body-sm text-on-surface-variant">
                        Chưa có mật độ theo giờ trong khoảng đã chọn.
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          {/* Acquisition + Session quality Stitch */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="flex flex-col rounded-xl bg-surface-container-low p-space-lg shadow-sm lg:col-span-6">
              <div className="mb-space-md flex items-center justify-between">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Nguồn thu hút tương tác ban đầu</h2>
                <span className="font-code-sm text-code-sm text-outline">Theo dõi hoạt động thử nghiệm</span>
              </div>
              {activityError ? (
                <AdminErrorState message={activityError} onRetry={() => void load()} />
              ) : acquisitionRows.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {privacyCopy(activity?.suppressed) ?? 'Chưa đủ sự kiện attribution để hiển thị.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {acquisitionRows.map((row) => {
                    const barTone =
                      row.tone === 'secondary'
                        ? 'bg-secondary'
                        : row.tone === 'tertiary'
                          ? 'bg-tertiary'
                          : row.tone === 'outline'
                            ? 'bg-outline'
                            : 'bg-primary'
                    return (
                      <div key={row.key} className="space-y-1">
                        <div className="flex justify-between gap-2 text-body-sm">
                          <span className="flex items-center gap-2 font-medium text-on-surface">
                            <MaterialIcon name={row.icon} className="text-[16px] text-primary" />
                            {row.label}
                          </span>
                          <span className="font-code-sm text-code-sm font-semibold text-on-surface">
                            {row.pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% (
                            {formatCount(row.count)} lượt)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                          <div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.min(100, row.pct)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section
              className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-lg shadow-sm lg:col-span-6"
              aria-labelledby="analytics-Chất lượng phiên"
            >
              <div>
                <div className="mb-space-md flex items-center justify-between">
                  <h2 id="analytics-Chất lượng phiên" className="font-headline-sm text-headline-sm text-on-surface">
                    Chất lượng phiên &amp; bảo mật mẫu
                  </h2>
                  <span className="rounded bg-primary-container/20 px-2 py-0.5 font-label-sm text-[10px] text-primary">
                    Ngưỡng K={overview?.privacyThreshold ?? 10}
                  </span>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-space-md">
                  <div className="rounded-lg bg-surface-container-lowest p-space-md">
                    <div className="mb-1 font-code-sm text-[11px] text-outline">Thời lượng trung bình</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-headline-xl text-headline-xl font-bold text-primary">
                        {overview?.sessionQuality.suppressed
                          ? '—'
                          : formatSuppressedMetric(overview?.sessionQuality.avgDurationMinutes, false)}
                      </span>
                      <span className="font-code-sm text-code-sm text-on-surface">phút</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-container-lowest p-space-md">
                    <div className="mb-1 font-code-sm text-[11px] text-outline">Khám phá trung bình / phiên</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-headline-xl text-headline-xl font-bold text-secondary">
                        {overview?.sessionQuality.suppressed
                          ? '—'
                          : formatSuppressedMetric(overview?.sessionQuality.avgDiscoveriesPerSession, false)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border-l-2 border-l-primary bg-surface-container-lowest p-space-md">
                <MaterialIcon name="security" className="mt-0.5 shrink-0 text-[20px] text-primary" />
                <div className="space-y-1">
                  <div className="font-label-sm text-label-sm font-semibold text-primary">
                    Đang bảo vệ dữ liệu cá nhân
                  </div>
                  <p className="font-body-sm text-body-sm leading-tight text-outline">
                    {privacyCopy(overview?.sessionQuality.suppressed) ??
                      `Các tập mẫu < ${overview?.privacyThreshold ?? 10} du khách được ẩn để bảo vệ danh tính vị trí GPS.`}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  )
}
