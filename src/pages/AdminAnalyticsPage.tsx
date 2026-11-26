import { AdminPagination } from '../components/admin/AdminPagination'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import '../styles/admin-analytics.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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

const POINTS_PER_PAGE = 5
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
  suppressed ? 'Chưa đủ mẫu để công bố.' : null

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
      'poiDistinctVisitors',
      item.poiName,
      String(item.sessionCount ?? ''),
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
        if (!locationId && items.length) {
          const preferred = items.find((item) => item.id === CU_CHI_LOCATION_ID) ?? items[0]
          update('locationId', preferred.id)
        }
      })
      .catch(() => setLocations([]))
  }, [])

  const requestVersion = useRef(0)
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    if (!locationId) {
      setBootLoading(false)
      return
    }
    setBootLoading(true)
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
    if (version !== requestVersion.current) return
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
    setSyncedAt(overviewResult.status === 'fulfilled' ? new Date().toLocaleTimeString('vi-VN') : null)
    setBootLoading(false)
    setRefreshing(false)
  }, [locationId, range])

  useEffect(() => {
    void load()
    return () => { requestVersion.current++ }
  }, [load])

  const selectedLocation = locations.find((item) => item.id === locationId)
  const locationName = selectedLocation?.name ?? 'Địa điểm'

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

  const points = useMemo(() => {
    const visits = new Map(overview?.journeyDropOff.map(point => [point.unlockKey, point]))
    const dwell = new Map(overview?.poiHeatmap.map(point => [point.unlockKey, point.avgDwellMs]))
    return [...(overview?.poiUnlockRates ?? [])]
      .sort((a, b) => Number(a.suppressed) - Number(b.suppressed)
        || (b.unlockCount ?? 0) - (a.unlockCount ?? 0)
        || a.name.localeCompare(b.name, 'vi'))
      .map(point => ({ ...point, visits: visits.get(point.unlockKey), dwell: dwell.get(point.unlockKey) }))
  }, [overview])
  const hasDwell = points.some(point => point.dwell != null && point.dwell > 0)
  const quests = overview?.questFunnel ?? []
  const reportedQuests = quests.filter(quest => !quest.suppressed)
  const hiddenQuests = quests.filter(quest => quest.suppressed)
  const [requestedPointPage, setPointPage] = useState(0)
  useEffect(() => setPointPage(0), [locationId, range])
  const pointPages = Math.ceil(points.length / POINTS_PER_PAGE)
  const pointPage = Math.min(requestedPointPage, Math.max(0, pointPages - 1))
  const firstPoint = pointPage * POINTS_PER_PAGE
  const visiblePoints = points.slice(firstPoint, firstPoint + POINTS_PER_PAGE)
  const reportedPoints = points.filter(point => !point.suppressed).length
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
    <section className="analytics-page ops-paper-page ops-work-page admin-page flex w-full max-w-7xl flex-col pb-16" aria-busy={bootLoading || refreshing}>
      <div className="admin-page-header flex flex-col gap-space-md py-space-lg">
        {syncedAt && <small className="text-on-surface-variant">Cập nhật lúc {syncedAt}</small>}
        <div className="flex flex-col justify-between gap-space-lg xl:flex-row xl:items-end">
          <div className="max-w-3xl space-y-1.5">
            <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Phân tích <span className="ops-title-accent">trải nghiệm</span></h1>
            <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
              Theo dõi lượt tham quan, tiến độ nhiệm vụ và thời lượng trải nghiệm tại di tích đã chọn.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <button
              type="button"
              className={btnGhost}
              disabled={refreshing || !overview}
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
          {overview && (
            <dl className="analytics-summary analytics-facts">
              {[
                { label: 'Khách hoạt động', value: formatCount(overview.activeUsers), hidden: overview.activitySuppressed, note: formatCount(overview.eventCount) + ' sự kiện trong kỳ' },
                { label: 'Khách hoàn thành nhiệm vụ', value: formatCount(overview.questCompletedCount), hidden: overview.questCompletedSuppressed, note: 'Theo sự kiện hoàn thành' },
                { label: 'Khám phá rồi check-in', value: formatPct(overview.onlineToOnsite.conversionRatePct), hidden: overview.onlineToOnsite.suppressed, note: 'Trong số khách đã khám phá' },
                { label: 'Thời lượng phiên trung bình', value: formatSuppressedMetric(overview.sessionQuality.avgDurationMinutes, false), hidden: overview.sessionQuality.suppressed, note: 'Phút trên mỗi phiên đã kết thúc' },
              ].map(({label, value, hidden, note}) => (
                <div key={label}><dt>{label}</dt><dd>{hidden ? 'Chưa đủ mẫu' : value}</dd><small>{hidden ? 'Ngưỡng công bố: ' + overview.privacyThreshold + ' khách' : note}</small></div>
              ))}
            </dl>
          )}
          {sparkValues.length > 1 && !overview?.activitySuppressed && (
            <div className="analytics-trend"><span>Khách hoạt động theo ngày</span>
              <svg aria-label="Xu hướng khách hoạt động" role="img" viewBox="0 0 100 24" preserveAspectRatio="none"><path d={sparkPath(sparkValues)} fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" strokeWidth="2" /></svg>
            </div>
          )}
          {overviewError && <AdminErrorState message={overviewError} onRetry={() => void load()} />}
          {overview && (
            <section className="analytics-report" aria-labelledby="quest-summary">
              <h2 id="quest-summary">Tỷ lệ khách hoàn thành từng nhiệm vụ</h2>
              {quests.length === 0 ? <p>Di tích chưa có nhiệm vụ trong báo cáo.</p> : (
                <>
                  {reportedQuests.length === 0 ? (
                    <p>Trong {parseInt(range, 10)} ngày qua, chưa thể công bố tỷ lệ hoàn thành cho nhiệm vụ nào trong {quests.length} nhiệm vụ tại {locationName}. Mỗi nhiệm vụ cần ít nhất {overview.privacyThreshold} khách bắt đầu và {overview.privacyThreshold} khách hoàn thành.</p>
                  ) : (
                    <p>Trong {parseInt(range, 10)} ngày qua, có số liệu cho {reportedQuests.length} trong {quests.length} nhiệm vụ. Tỷ lệ được tính bằng số khách hoàn thành chia cho số khách bắt đầu từng nhiệm vụ.</p>
                  )}
                  {reportedQuests.map(quest => (
                    <div className="analytics-quest" key={quest.questId}>
                      <strong>{quest.title}</strong>
                      <span>{formatCount(quest.completed)} hoàn thành / {formatCount(quest.started)} khách bắt đầu</span>
                      <b>{formatPct(quest.completionRatePct)}</b>
                    </div>
                  ))}
                  {hiddenQuests.length > 0 && (
                    <details className="analytics-private">
                      <summary>Xem {hiddenQuests.length} nhiệm vụ chưa đủ mẫu</summary>
                      <p>Tỷ lệ chỉ hiển thị khi cả số khách bắt đầu và số khách hoàn thành đạt {overview.privacyThreshold}. Các nhiệm vụ dưới ngưỡng vẫn có thể có người tham gia.</p>
                      <ul>{hiddenQuests.map(quest => <li key={quest.questId}>{quest.title}</li>)}</ul>
                    </details>
                  )}
                </>
              )}
            </section>
          )}
          <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
            {overview && <section className="analytics-report lg:col-span-7" aria-labelledby="point-summary">
              <h2 id="point-summary">Hoạt động tại các điểm khám phá</h2>
              {points.length === 0 ? <p>Danh mục của di tích chưa có điểm khám phá.</p> : (
                <>
                  <p><strong>{points.length} điểm trong danh mục</strong> · {reportedPoints} điểm đủ mẫu để công bố số khách mở khóa.</p>
                  <div className="overflow-x-auto">
                    <table className="analytics-point-table">
                      <thead><tr><th>Điểm khám phá</th><th>Khách mở khóa</th><th>Khách khám phá trong phiên</th>{hasDwell && <th>Dừng trung bình</th>}</tr></thead>
                      <tbody>{visiblePoints.map(point => (
                        <tr key={point.unlockKey}>
                          <th scope="row">{point.name}</th>
                          <td>{point.suppressed ? 'Dưới ngưỡng' : formatCount(point.unlockCount)}</td>
                          <td>{point.visits?.suppressed ? 'Dưới ngưỡng' : formatCount(point.visits?.sessionCount)}</td>
                          {hasDwell && <td>{dwellLabel(point.dwell)}</td>}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <small aria-live="polite">Điểm {firstPoint + 1}–{firstPoint + visiblePoints.length} trong {points.length}</small>
                    {pointPages > 1 && <AdminPagination variant="stitch" page={pointPage} totalPages={pointPages} onPageChange={setPointPage} />}
                  </div>
                  <p className="analytics-reading-note">Mở khóa tính theo ghi nhận mở điểm. Khám phá trong phiên tính mỗi khách một lần tại mỗi điểm. Một khách có thể khám phá nhiều điểm.</p>
                </>
              )}
            </section>}
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
              ) : !heatmap?.cells.some((cell) => !cell.suppressed && ((cell.activeUsers ?? 0) > 0 || cell.intensity > 0)) ? (
                <p className="analytics-empty">Chưa có số liệu đủ để hiển thị mật độ theo giờ trong kỳ này.</p>
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

                  <div className="analytics-hour-grid space-y-1" role="region" aria-label="Mật độ hoạt động trong 24 giờ" tabIndex={0}>
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
                  </div>
                </>
              )}
            </section>
          </div>

          {/* Acquisition + Session quality Stitch */}
          <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
            <section className="flex flex-col rounded-xl bg-surface-container-low p-space-lg shadow-sm lg:col-span-6">
              <div className="mb-space-md flex items-center justify-between">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Nguồn thu hút tương tác ban đầu</h2>
                <span className="font-code-sm text-code-sm text-outline">Toàn bộ chương trình pilot</span>
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
