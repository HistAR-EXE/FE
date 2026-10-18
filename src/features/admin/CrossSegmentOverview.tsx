import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import {
  adminApi,
  type AdminB2b2cInquiry,
  type AdminBillingOverview,
  type AdminPlanRevenue,
  type ReferralStatsItem,
} from './api'

type SegmentData = {
  billing: AdminBillingOverview | null
  inquiries: AdminB2b2cInquiry[]
  referrals: ReferralStatsItem[]
  loading: boolean
  error: string | null
}

const money = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString('vi-VN') : '—'

function pctBar(value: number, max: number, color: string) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right font-code-sm text-code-sm text-outline">{pct}%</span>
    </div>
  )
}

export function CrossSegmentOverview() {
  const [data, setData] = useState<SegmentData>({
    billing: null,
    inquiries: [],
    referrals: [],
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const [billingRaw, inquiryPage, referrals] = await Promise.all([
        adminApi.billingOverview(6),
        adminApi.listB2b2cInquiries({ page: 0, size: 100 }),
        adminApi.referralStats(30),
      ])
      setData({
        billing: billingRaw,
        inquiries: inquiryPage.items,
        referrals,
        loading: false,
        error: null,
      })
    } catch {
      setData((prev) => ({ ...prev, loading: false, error: 'Không tải được dữ liệu cross-segment' }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const segments = useMemo(() => {
    const { billing, inquiries, referrals } = data
    if (!billing) return null

    const latestMonth = billing.monthlyRevenue.at(-1)
    const b2cRevenue = latestMonth?.b2cRevenueVnd ?? 0
    const b2bRevenue = latestMonth?.b2bRevenueVnd ?? 0
    const totalRevenue = b2cRevenue + b2bRevenue

    // B2C metrics from plan revenue
    const b2cPlans = (billing.planRevenue ?? []).filter(
      (p: AdminPlanRevenue) => /PREMIUM|FREE/i.test(p.plan) && !/MICRO|STANDARD/i.test(p.plan),
    )
    const b2cPlanRevenue = b2cPlans.reduce((s: number, p: AdminPlanRevenue) => s + p.revenueVnd, 0)

    // B2B metrics from plan revenue
    const b2bPlans = (billing.planRevenue ?? []).filter((p: AdminPlanRevenue) =>
      /MICRO|STANDARD|PREMIUM.*B2B/i.test(p.plan),
    )
    const b2bPlanRevenue = b2bPlans.reduce((s: number, p: AdminPlanRevenue) => s + p.revenueVnd, 0)

    // B2B2C pipeline
    const inquiryByStatus = inquiries.reduce(
      (acc: Record<string, number>, i: AdminB2b2cInquiry) => {
        const s = i.status.toUpperCase()
        acc[s] = (acc[s] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Referral stats
    const totalVisits = referrals.reduce((s: number, r: ReferralStatsItem) => s + (r.visits ?? 0), 0)
    const totalUnique = referrals.reduce((s: number, r: ReferralStatsItem) => s + (r.uniqueUsers ?? 0), 0)
    const activeRefs = referrals.filter((r: ReferralStatsItem) => r.active).length

    return {
      b2c: { revenue: b2cRevenue, planRevenue: b2cPlanRevenue, paidSubs: billing.activePaidSubscriptions },
      b2b: { revenue: b2bRevenue, planRevenue: b2bPlanRevenue },
      b2b2c: {
        total: inquiries.length,
        pending: inquiryByStatus['PENDING'] ?? 0,
        contacted: inquiryByStatus['CONTACTED'] ?? 0,
        converted: inquiryByStatus['CONVERTED'] ?? 0,
        rejected: inquiryByStatus['REJECTED'] ?? 0,
      },
      referral: { totalVisits, totalUnique, activeRefs, totalCodes: referrals.length },
      totalRevenue,
    }
  }, [data])

  if (data.loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-space-lg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="font-body-md text-body-md text-outline">Đang phân tích cross-segment...</span>
      </div>
    )
  }

  if (data.error || !segments) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-error/5 p-space-md">
        <span className="font-body-md text-body-md text-error">{data.error}</span>
        <button type="button" onClick={() => void load()} className="font-headline-sm text-headline-sm text-primary hover:underline">
          Thử lại
        </button>
      </div>
    )
  }

  const SEGMENT_CARDS = [
    {
      key: 'b2c',
      label: 'B2C Cá nhân',
      sublabel: 'Freemium + Premium',
      icon: 'person',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      barColor: 'bg-primary',
      revenue: segments.b2c.revenue,
      metrics: [
        { label: 'Doanh thu tháng', value: money(segments.b2c.revenue) + ' đ' },
        { label: 'Thuê bao trả phí', value: String(segments.b2c.paidSubs ?? 0) },
      ],
      link: '/admin/billing',
    },
    {
      key: 'b2b',
      label: 'B2B Trường học',
      sublabel: 'Micro · Standard · Premium',
      icon: 'school',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      barColor: 'bg-secondary',
      revenue: segments.b2b.revenue,
      metrics: [
        { label: 'Doanh thu tháng', value: money(segments.b2b.revenue) + ' đ' },
        { label: 'Doanh thu theo gói', value: money(segments.b2b.planRevenue) + ' đ' },
      ],
      link: '/admin/billing?tab=organizations',
    },
    {
      key: 'b2b2c',
      label: 'B2B2C Di sản',
      sublabel: 'Heritage Digitization',
      icon: 'account_balance',
      color: 'text-tertiary',
      bgColor: 'bg-tertiary/10',
      barColor: 'bg-tertiary',
      revenue: 0,
      metrics: [
        { label: 'Tổng lead', value: String(segments.b2b2c.total) },
        { label: 'Đang xử lý', value: String(segments.b2b2c.pending + segments.b2b2c.contacted) },
        { label: 'Chuyển đổi', value: String(segments.b2b2c.converted) },
      ],
      link: '/admin/billing?tab=pipeline',
    },
  ] as const

  return (
    <section aria-labelledby="cross-segment-title" className="space-y-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon name="hub" className="text-[20px] text-primary" />
          <h2 id="cross-segment-title" className="font-headline-md text-headline-md text-on-surface">
            Phân tích Cross-Segment
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1 rounded-lg bg-surface-container-high px-3 py-2.5 font-headline-sm text-headline-sm text-on-surface hover:bg-surface-variant min-h-[44px]"
        >
          <MaterialIcon name="refresh" className="text-[16px]" />
          Cập nhật
        </button>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-1 gap-gutter-desktop md:grid-cols-3">
        {SEGMENT_CARDS.map((seg) => (
          <Link
            key={seg.key}
            to={seg.link}
            className="group flex flex-col gap-3 rounded-xl bg-surface-container-low p-space-md shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${seg.bgColor}`}>
                  <MaterialIcon name={seg.icon} className={`text-[18px] ${seg.color}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`font-headline-sm text-headline-sm ${seg.color}`}>{seg.label}</span>
                  <span className="font-code-sm text-code-sm text-outline">{seg.sublabel}</span>
                </div>
              </div>
              <MaterialIcon
                name="arrow_forward"
                className="text-[16px] text-outline opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>

            {/* Revenue share bar */}
            {seg.key !== 'b2b2c' && segments.totalRevenue > 0 && (
              <div className="space-y-1">
                <span className="font-code-sm text-code-sm text-outline">Tỷ trọng doanh thu</span>
                {pctBar(seg.revenue, segments.totalRevenue, seg.barColor)}
              </div>
            )}

            {/* Metrics */}
            <div className="flex flex-col gap-1.5 border-t border-surface-container-high pt-2">
              {seg.metrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-outline">{m.label}</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface">{m.value}</span>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* B2B2C Pipeline funnel */}
      {segments.b2b2c.total > 0 && (
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MaterialIcon name="filter_alt" className="text-[18px] text-tertiary" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Pipeline B2B2C</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Chờ xử lý', value: segments.b2b2c.pending, icon: 'hourglass_empty', tone: 'text-outline' },
              { label: 'Đã liên hệ', value: segments.b2b2c.contacted, icon: 'call', tone: 'text-primary' },
              { label: 'Chuyển đổi', value: segments.b2b2c.converted, icon: 'check_circle', tone: 'text-secondary' },
              { label: 'Từ chối', value: segments.b2b2c.rejected, icon: 'cancel', tone: 'text-error' },
            ].map((stage) => (
              <div key={stage.label} className="flex flex-col items-center gap-1 rounded-lg bg-surface-container p-3">
                <MaterialIcon name={stage.icon} className={`text-[24px] ${stage.tone}`} />
                <span className="font-headline-lg text-headline-lg text-on-surface">{stage.value}</span>
                <span className="font-code-sm text-code-sm text-outline">{stage.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral cross-segment stats */}
      <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <MaterialIcon name="share" className="text-[18px] text-primary" />
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Referral Cross-Segment</h3>
          <span className="font-code-sm text-code-sm text-outline">(30 ngày gần nhất)</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Mã giới thiệu', value: segments.referral.totalCodes, icon: 'confirmation_number' },
            { label: 'Đang hoạt động', value: segments.referral.activeRefs, icon: 'toggle_on' },
            { label: 'Lượt truy cập', value: segments.referral.totalVisits, icon: 'visibility' },
            { label: 'Người dùng mới', value: segments.referral.totalUnique, icon: 'person_add' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-lg bg-surface-container p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
                <MaterialIcon name={stat.icon} className="text-[18px] text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-md text-headline-md text-on-surface">{stat.value.toLocaleString('vi-VN')}</span>
                <span className="font-code-sm text-code-sm text-outline">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
