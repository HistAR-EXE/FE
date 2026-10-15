import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminErrorState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import {
  adminApi,
  type AdminAuditEvent,
  type AdminBillingOverview,
  type AdminDashboardSummary,
} from '../features/admin/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { MaterialIcon } from '../components/ui/MaterialIcon'

const money = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString('vi-VN') : '—'

const moneyVnd = (value: number | null | undefined) =>
  typeof value === 'number' ? `${value.toLocaleString('vi-VN')} đ` : '—'

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes}p trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}g trước`
  return new Date(iso).toLocaleString('vi-VN')
}

function auditIcon(action: string) {
  if (action.includes('DELETE')) return { icon: 'flag', tone: 'text-error bg-error/10' }
  if (action.includes('REVIEW') || action.includes('APPROV')) return { icon: 'task_alt', tone: 'text-tertiary bg-tertiary/10' }
  if (action.includes('CREATE') || action.includes('RESTORE')) return { icon: 'how_to_reg', tone: 'text-primary bg-primary/10' }
  return { icon: 'receipt_long', tone: 'text-secondary bg-secondary/10' }
}

export function AdminDashboardPage() {
  const [operations, setOperations] = useState<AdminDashboardSummary | null>(null)
  const [billing, setBilling] = useState<AdminBillingOverview | null>(null)
  const [audit, setAudit] = useState<AdminAuditEvent[]>([])
  const [operationsError, setOperationsError] = useState<string | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [operationsLoading, setOperationsLoading] = useState(true)
  const [billingLoading, setBillingLoading] = useState(true)
  const [showTableView, setShowTableView] = useState(false)

  const loadOperations = useCallback(async () => {
    setOperationsLoading(true)
    setOperationsError(null)
    try { setOperations(await adminApi.dashboardSummary()) }
    catch (cause) { setOperations(null); setOperationsError(getFriendlyErrorMessage(cause, 'quest')) }
    finally { setOperationsLoading(false) }
  }, [])
  const loadBilling = useCallback(async () => {
    setBillingLoading(true)
    setBillingError(null)
    try { setBilling(await adminApi.billingOverview(6)) }
    catch (cause) { setBilling(null); setBillingError(getFriendlyErrorMessage(cause, 'quest')) }
    finally { setBillingLoading(false) }
  }, [])
  const loadAudit = useCallback(async () => {
    try {
      const page = await adminApi.listAudit({ page: 0, size: 5, sort: 'occurredAt,desc' })
      setAudit(page.items)
    } catch {
      setAudit([])
    }
  }, [])
  const load = useCallback(async () => {
    await Promise.allSettled([loadOperations(), loadBilling(), loadAudit()])
  }, [loadAudit, loadBilling, loadOperations])

  useEffect(() => { void load() }, [load])

  const mom = billing?.monthOverMonthPct
  const chartRows = billing?.monthlyRevenue ?? []
  const sixMonthTotal = useMemo(
    () => chartRows.reduce((sum, row) => sum + row.b2cRevenueVnd + row.b2bRevenueVnd, 0),
    [chartRows],
  )
  const peakIndex = useMemo(() => {
    if (!chartRows.length) return -1
    let best = 0
    chartRows.forEach((row, index) => {
      const total = row.b2cRevenueVnd + row.b2bRevenueVnd
      const bestTotal = chartRows[best].b2cRevenueVnd + chartRows[best].b2bRevenueVnd
      if (total >= bestTotal) best = index
    })
    return best
  }, [chartRows])

  const queue = operations ? [
    {
      label: 'Bản nháp',
      detail: 'nội dung',
      value: operations.draftCount,
      to: '/admin/narrative-pilots?reviewStatus=DRAFT',
      icon: 'edit_note',
      badge: 'Chờ biên soạn',
      tone: 'neutral' as const,
    },
    {
      label: 'Chờ duyệt',
      detail: 'nhiệm vụ',
      value: operations.reviewPendingCount,
      to: '/admin/narrative-pilots?reviewStatus=DRAFT',
      icon: 'fact_check',
      badge: 'Cần duyệt',
      tone: 'warn' as const,
    },
    {
      label: 'Báo cáo đang mở',
      detail: 'báo cáo',
      value: operations.contentReportsLast30Days,
      to: '/admin/content?tab=reports&status=NEW',
      icon: 'gavel',
      badge: 'Khẩn cấp',
      tone: 'danger' as const,
    },
    {
      label: 'Thùng rác',
      detail: 'mục',
      value: operations.trashCount,
      to: '/admin/trash',
      icon: 'delete_sweep',
      badge: 'Khôi phục',
      tone: 'neutral' as const,
    },
  ] : []

  return (
    <section className="flex w-full flex-col space-y-space-lg pb-4" aria-busy={operationsLoading || billingLoading}>
      <AdminPageHeader
        eyebrow="Trung tâm chỉ huy Ops Core"
        title="Bàn điều hành"
        description="Tổng hợp chỉ số doanh thu thực tế, hàng đợi ưu tiên và nhật ký vận hành từ API HistAR."
        actions={billing ? (
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 shadow-sm">
              <MaterialIcon name="sync" className="text-[16px] text-primary" />
              <div className="flex flex-col">
                <span className="font-code-sm text-code-sm leading-none text-on-surface-variant">Cập nhật lúc</span>
                <span className="font-label-sm text-label-sm font-semibold leading-tight text-on-surface">
                  {new Date(billing.updatedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
            <Link
              to="/admin/billing"
              className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3.5 py-2 font-headline-sm text-headline-sm text-on-surface transition-all hover:bg-surface-variant"
            >
              <MaterialIcon name="file_download" className="text-[18px] text-outline" />
              Xuất báo cáo
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3.5 py-2 font-headline-sm text-headline-sm text-on-surface transition-all hover:bg-surface-variant"
            >
              <MaterialIcon name="refresh" className="text-[18px] text-outline" />
              Làm mới
            </button>
          </div>
        ) : undefined}
      />

      <section aria-labelledby="dashboard-kpi-title" className="space-y-space-sm">
        <h2 id="dashboard-kpi-title" className="sr-only">Chỉ số chính</h2>
        {billingLoading && <AdminLoading label="Đang tải doanh thu" />}
        {!billingLoading && billingError && (
          <AdminErrorState message={`Không tải được doanh thu: ${billingError}`} onRetry={loadBilling} />
        )}
        <div className="grid grid-cols-1 gap-gutter-desktop sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />
            <div className="flex items-center justify-between">
              <span className="font-body-md text-body-md text-outline">Doanh thu thực thu tháng này</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-container-high text-primary">
                <MaterialIcon name="payments" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl tracking-tight text-on-surface">{money(billing?.actualRevenueMonthVnd)}</span>
              <span className="font-label-sm text-label-sm text-outline">VNĐ</span>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3">
              {mom == null ? (
                <span className="font-code-sm text-code-sm text-outline">Chưa có MoM</span>
              ) : (
                <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${mom >= 0 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>
                  <MaterialIcon name={mom >= 0 ? 'trending_up' : 'trending_down'} className="text-[14px]" />
                  <span className="font-code-sm text-code-sm font-semibold">{mom.toLocaleString('vi-VN')}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-secondary/5 blur-2xl" />
            <div className="flex items-center justify-between">
              <span className="font-body-md text-body-md text-outline">So với tháng trước</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-container-high text-secondary">
                <MaterialIcon name="query_stats" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl tracking-tight text-secondary">
                {mom == null ? '—' : `${mom >= 0 ? '+' : ''}${mom.toLocaleString('vi-VN')}%`}
              </span>
              <span className="font-body-sm text-body-sm text-outline">MoM</span>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3">
              <span className="font-code-sm text-code-sm text-outline">Tăng trưởng lũy kế</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-container-highest">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, Math.max(8, Math.abs(mom ?? 0)))}%` }} />
              </div>
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-tertiary/5 blur-2xl" />
            <div className="flex items-center justify-between">
              <span className="font-body-md text-body-md text-outline">MRR ước tính</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-container-high text-tertiary">
                <MaterialIcon name="autorenew" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl tracking-tight text-on-surface">{money(billing?.estimatedMrrVnd)}</span>
              <span className="font-label-sm text-label-sm text-outline">VNĐ</span>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3">
              <span className="font-code-sm text-code-sm text-outline">ARR: <strong className="text-on-surface">{money(billing?.estimatedArrVnd)}</strong></span>
              <span className="font-code-sm text-code-sm text-outline">Paid: <strong className="text-primary">{billing?.activePaidSubscriptions?.toLocaleString('vi-VN') ?? '—'}</strong></span>
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />
            <div className="flex items-center justify-between">
              <span className="font-body-md text-body-md text-outline">Pilot đang hoạt động</span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-container-high text-primary">
                <MaterialIcon name="auto_stories" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl tracking-tight text-on-surface">
                {operations ? operations.activePilots.toLocaleString('vi-VN') : '—'}
              </span>
              <span className="font-body-sm text-body-sm font-medium text-primary">pilot live</span>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3">
              <span className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-primary" />
                dashboardSummary
              </span>
              <span className="rounded bg-surface-container px-2 py-0.5 font-code-sm text-code-sm text-outline">Live</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-queue-title" className="flex flex-col space-y-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="notification_important" className="text-[20px] text-primary" />
            <h2 id="dashboard-queue-title" className="font-headline-md text-headline-md text-on-surface">Hàng đợi xử lý ưu tiên</h2>
          </div>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Yêu cầu can thiệp ngay</span>
        </div>
        {operationsLoading && <AdminLoading label="Đang tải hàng đợi vận hành" />}
        {!operationsLoading && operationsError && (
          <AdminErrorState message={`Không tải được vận hành: ${operationsError}`} onRetry={loadOperations} />
        )}
        {operations && (
          <div className="grid grid-cols-1 gap-gutter-desktop sm:grid-cols-2 lg:grid-cols-4">
            {queue.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="group flex items-center justify-between rounded-xl bg-surface-container-low p-space-md text-left shadow-sm transition-all hover:bg-surface-container-high"
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${
                    item.tone === 'danger' ? 'bg-error-container/40 text-error'
                      : item.tone === 'warn' ? 'bg-tertiary/20 text-tertiary'
                        : 'bg-surface-container-high text-outline group-hover:text-on-surface'
                  }`}>
                    <MaterialIcon name={item.icon} className="text-[20px]" />
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-body-md text-body-md ${
                      item.tone === 'danger' ? 'text-error' : item.tone === 'warn' ? 'text-tertiary' : 'text-outline'
                    }`}>{item.label}</span>
                    <span className="font-headline-md text-headline-md text-on-surface">
                      {item.value}{' '}
                      <span className="font-body-sm text-body-sm text-outline">{item.detail}</span>
                    </span>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 font-label-sm text-label-sm font-semibold uppercase ${
                  item.tone === 'danger' ? 'bg-error/20 text-error'
                    : item.tone === 'warn' ? 'animate-pulse bg-tertiary/15 text-tertiary'
                      : 'bg-surface-container text-outline'
                }`}>
                  {item.badge}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Image 5: chart 8 cols + ops log 4 cols + bottom telemetry */}
      <div className="grid grid-cols-1 items-start gap-gutter-desktop lg:grid-cols-12">
        <div className="flex flex-col space-y-space-md lg:col-span-8">
          <section aria-labelledby="dashboard-revenue-title" className="rounded-xl bg-surface-container-low p-space-lg shadow-sm">
            <div className="flex flex-col justify-between gap-space-sm pb-space-md sm:flex-row sm:items-center">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="monitoring" className="text-[20px] text-primary" />
                  <h2 id="dashboard-revenue-title" className="font-headline-md text-headline-md text-on-surface">Doanh thu 6 tháng gần nhất</h2>
                </div>
                <span className="font-body-sm text-body-sm text-outline">
                  So sánh đóng góp giữa cá nhân khám phá (B2C) và hợp đồng tổ chức (B2B)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-space-md">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                    <span className="font-code-sm text-code-sm text-on-surface-variant">Doanh thu B2C</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-secondary" />
                    <span className="font-code-sm text-code-sm text-on-surface-variant">Doanh thu B2B</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTableView((value) => !value)}
                  className="flex items-center gap-1 rounded bg-surface-container px-2.5 py-1 font-code-sm text-code-sm text-on-surface-variant shadow-sm hover:text-on-surface"
                >
                  <MaterialIcon name="table_chart" className="text-[16px]" />
                  {showTableView ? 'Biểu đồ trực quan' : 'Bảng số liệu'}
                </button>
              </div>
            </div>

            {billing && chartRows.length > 0 ? (
              showTableView ? (
                <div className="w-full overflow-x-auto pt-2">
                  <table className="w-full text-left font-body-sm text-body-sm">
                    <caption className="sr-only">Doanh thu B2C và Doanh thu B2B theo tháng</caption>
                    <thead>
                      <tr className="bg-surface-container-lowest font-label-sm text-label-sm uppercase text-outline">
                        <th className="px-3 py-2.5">Chu kỳ</th>
                        <th className="px-3 py-2.5">Doanh thu B2C</th>
                        <th className="px-3 py-2.5">Doanh thu B2B</th>
                        <th className="px-3 py-2.5 text-right">Tổng thực thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high">
                      {[...chartRows].reverse().map((row, index) => (
                        <tr key={row.month} className="hover:bg-surface-container-high/50">
                          <td className="px-3 py-2 font-code-sm text-on-surface">{row.month}</td>
                          <td className="px-3 py-2 font-code-sm font-medium text-primary">{moneyVnd(row.b2cRevenueVnd)}</td>
                          <td className="px-3 py-2 font-code-sm font-medium text-secondary">{moneyVnd(row.b2bRevenueVnd)}</td>
                          <td className="px-3 py-2 text-right font-code-sm font-bold text-on-surface">
                            {moneyVnd(row.b2cRevenueVnd + row.b2bRevenueVnd)}
                            {chartRows.length - 1 - index === peakIndex && (
                              <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary">Đỉnh</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="w-full pt-4" role="img" aria-label="Biểu đồ Doanh thu B2C và Doanh thu B2B 6 tháng">
                  <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
                    Doanh thu B2C và B2B đã ghi nhận theo tháng; không bao gồm MRR ước tính.
                  </p>
                  {(() => {
                    const maxVal = Math.max(
                      1,
                      ...chartRows.map((row) => Math.max(row.b2cRevenueVnd, row.b2bRevenueVnd)),
                    )
                    return (
                      <div className="relative flex h-64 w-full items-end gap-3 px-2 pb-6 sm:gap-6">
                        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full flex-col justify-between opacity-20">
                          {[0, 1, 2, 3, 4].map((line) => (
                            <div key={line} className="h-px w-full bg-outline" />
                          ))}
                        </div>
                        {chartRows.map((row, index) => {
                          const label = row.month.includes('-')
                            ? `Thg ${Number(row.month.split('-')[1])}`
                            : row.month
                          const b2cPct = Math.max(4, Math.round((row.b2cRevenueVnd / maxVal) * 100))
                          const b2bPct = Math.max(4, Math.round((row.b2bRevenueVnd / maxVal) * 100))
                          const isPeak = index === peakIndex
                          return (
                            <div
                              key={row.month}
                              className={`relative z-10 flex h-full flex-1 cursor-default flex-col items-center justify-end ${isPeak ? '' : 'group'}`}
                              title={`${row.month} · B2C ${moneyVnd(row.b2cRevenueVnd)} · B2B ${moneyVnd(row.b2bRevenueVnd)}`}
                            >
                              {isPeak && (
                                <span className="absolute -top-7 rounded bg-primary px-1.5 py-0.5 font-code-sm text-[10px] font-bold text-on-primary shadow-md">
                                  Đỉnh
                                </span>
                              )}
                              <div className="flex h-full w-full items-end justify-center gap-1 sm:gap-2">
                                <div
                                  className={`w-3 rounded-t transition-all sm:w-5 ${isPeak ? 'bg-primary shadow-[0_0_12px_rgba(16,185,129,0.35)]' : 'bg-primary/80 group-hover:bg-primary'}`}
                                  style={{ height: `${b2cPct}%` }}
                                />
                                <div
                                  className={`w-3 rounded-t transition-all sm:w-5 ${isPeak ? 'bg-secondary shadow-[0_0_12px_rgba(76,215,246,0.35)]' : 'bg-secondary/80 group-hover:bg-secondary'}`}
                                  style={{ height: `${b2bPct}%` }}
                                />
                              </div>
                              <span className={`mt-2 font-code-sm text-code-sm ${isPeak ? 'font-bold text-primary' : 'text-outline group-hover:text-on-surface'}`}>
                                {label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                  {/* Accessible data table for AdminChart contract / screen readers */}
                  <table className="sr-only">
                    <caption>Doanh thu B2C</caption>
                    <thead>
                      <tr>
                        <th>Tháng</th>
                        <th>Doanh thu B2C</th>
                        <th>Doanh thu B2B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartRows.map((row) => (
                        <tr key={`a11y-${row.month}`}>
                          <td>{row.month}</td>
                          <td>{moneyVnd(row.b2cRevenueVnd)}</td>
                          <td>{moneyVnd(row.b2bRevenueVnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : billing ? (
              <p className="py-8 font-body-md text-body-md text-on-surface-variant">Chưa có dữ liệu doanh thu theo tháng.</p>
            ) : null}

            {billing && (
              <div className="mt-2 flex flex-wrap items-center justify-between pt-3 font-body-sm text-body-sm text-outline">
                <span>
                  Tổng gộp 6 tháng: <strong className="font-headline-sm text-on-surface">{moneyVnd(sixMonthTotal)}</strong>
                </span>
                <span className="flex items-center gap-1 font-code-sm text-code-sm text-primary">
                  <MaterialIcon name="verified" className="text-[16px]" />
                  Cập nhật lúc {new Date(billing.updatedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-gutter-desktop sm:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-md shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-outline">Thuê bao đang trả phí</span>
                <MaterialIcon name="local_activity" className="text-[18px] text-primary" />
              </div>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {billing?.activePaidSubscriptions?.toLocaleString('vi-VN') ?? '—'}
                </span>
              </div>
              <span className="truncate font-code-sm text-code-sm text-outline">Từ billingOverview</span>
            </div>
            <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-md shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-outline">ARR ước tính</span>
                <MaterialIcon name="timer" className="text-[18px] text-secondary" />
              </div>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-on-surface">{money(billing?.estimatedArrVnd)}</span>
                <span className="ml-1 font-label-sm text-label-sm text-outline">VNĐ</span>
              </div>
              <span className="truncate font-code-sm text-code-sm text-outline">Ước tính định kỳ năm</span>
            </div>
            <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-md shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-outline">Pilot đang hoạt động</span>
                <MaterialIcon name="star" className="text-[18px] text-tertiary" />
              </div>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-tertiary">
                  {operations ? operations.activePilots.toLocaleString('vi-VN') : '—'}
                </span>
              </div>
              <span className="truncate font-code-sm text-code-sm text-outline">
                Chờ duyệt: {operations?.reviewPendingCount ?? '—'} · Bản nháp: {operations?.draftCount ?? '—'}
              </span>
            </div>
          </div>
        </div>

        <aside className="flex flex-col space-y-space-md rounded-xl bg-surface-container-low p-space-lg shadow-sm lg:col-span-4" aria-labelledby="ops-log-title">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MaterialIcon name="bolt" className="text-[20px] text-primary" />
              <h2 id="ops-log-title" className="font-headline-md text-headline-md text-on-surface">Nhật ký vận hành</h2>
            </div>
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          </div>
          <p className="-mt-2 font-body-sm text-body-sm text-outline">
            Dòng sự kiện kiểm toán gần đây (thanh toán, phê duyệt, thay đổi nội dung).
          </p>
          <div className="flex flex-col divide-y divide-surface-container-high/40 space-y-space-sm">
            {audit.length === 0 && (
              <p className="py-6 font-body-sm text-body-sm text-outline">Chưa có sự kiện audit gần đây.</p>
            )}
            {audit.map((event) => {
              const meta = auditIcon(event.action)
              return (
                <div key={event.id} className="flex items-start gap-3 pt-space-sm first:pt-0">
                  <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${meta.tone}`}>
                    <MaterialIcon name={meta.icon} className="text-[16px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-headline-sm text-headline-sm text-on-surface">{event.action}</span>
                      <span className="shrink-0 font-code-sm text-code-sm text-outline">{relativeTime(event.occurredAt)}</span>
                    </div>
                    <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                      {event.entityType} · {event.entityId.slice(0, 12)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-[10px] text-outline">
                        {event.actorName ?? event.actorEmailMasked ?? event.actorId.slice(0, 8)}
                      </span>
                      {event.reason && (
                        <span className="truncate font-code-sm text-code-sm text-outline">{event.reason}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <Link
            to="/admin/audit"
            className="mt-2 block w-full rounded-lg bg-surface-container-high py-2 text-center font-headline-sm text-headline-sm text-on-surface transition-colors hover:bg-surface-variant"
          >
            Xem tất cả nhật ký{audit.length ? ` (${audit.length}+ sự kiện)` : ''}
          </Link>
        </aside>
      </div>
    </section>
  )
}
