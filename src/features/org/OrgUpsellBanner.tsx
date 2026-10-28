// src/features/org/OrgUpsellBanner.tsx
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { OrgBillingStatus } from './api'

type PlanTier = 'MICRO' | 'STANDARD' | 'PREMIUM' | 'TRIAL'

const PLAN_UPGRADES: Record<string, { next: PlanTier; label: string; features: string[]; price: string }> = {
  TRIAL: {
    next: 'STANDARD',
    label: 'Standard Package',
    features: ['40 CCU đồng thời', '400 tài khoản', '30.000 AI queries/tháng', 'Giao bài tập & Live Board'],
    price: '15.000.000đ/năm',
  },
  MICRO: {
    next: 'STANDARD',
    label: 'Standard Package',
    features: ['Nâng CCU từ 15 → 40', 'Tài khoản từ 100 → 400', 'AI queries từ 5K → 30K', 'Giao bài tập & Live Board'],
    price: '15.000.000đ/năm',
  },
  STANDARD: {
    next: 'PREMIUM',
    label: 'Premium Package',
    features: ['Nâng CCU từ 40 → 80', 'Tài khoản từ 400 → 1.000', 'AI queries không giới hạn', 'LMS Premium & Dashboard B2B'],
    price: '25.000.000đ/năm',
  },
}

type OrgUpsellBannerProps = {
  billing: OrgBillingStatus
}

export function OrgUpsellBanner({ billing }: OrgUpsellBannerProps) {
  const plan = billing.planType?.toUpperCase() ?? 'TRIAL'
  const upgrade = PLAN_UPGRADES[plan]

  if (!upgrade) return null

  const usagePercent = billing.aiQueriesLimit
    ? Math.round((billing.aiQueriesUsed / billing.aiQueriesLimit) * 100)
    : 0

  const isNearLimit = usagePercent >= 70 || billing.ccuLimitReached || billing.accountLimitReached

  return (
    <div className={`rounded-2xl border p-6 space-y-4 ${
      isNearLimit
        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-[0_4px_20px_rgba(253,201,8,0.2)]'
        : 'bg-gradient-to-r from-blue-50/50 to-white border-[#0275FB]/20'
    }`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isNearLimit && <MaterialIcon name="warning" className="text-amber-500 text-xl" />}
            <h4 className="font-black text-[#1E293B] text-base">
              {isNearLimit ? 'Sắp đạt giới hạn gói hiện tại' : `Nâng cấp lên ${upgrade.label}`}
            </h4>
          </div>
          {isNearLimit && (
            <p className="text-sm text-[#475569]">
              {billing.ccuLimitReached && 'CCU đã đạt tối đa. '}
              {billing.accountLimitReached && 'Tài khoản đã đạt tối đa. '}
              {usagePercent >= 70 && `AI queries đã dùng ${usagePercent}%. `}
              Nâng cấp để mở rộng.
            </p>
          )}
        </div>
        <Link
          to={`/checkout/b2b?plan=${upgrade.next}`}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#0275FB] to-[#1d4ed8] text-white font-black text-sm uppercase tracking-wider shadow-md hover:scale-105 transition-all min-h-[44px]"
        >
          <span>Nâng cấp {upgrade.next}</span>
          <MaterialIcon name="arrow_forward" className="text-base" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {upgrade.features.map((f) => (
          <div key={f} className="flex items-start gap-2 text-xs font-semibold text-[#334155]">
            <MaterialIcon name="check_circle" className="text-[#0275FB] text-sm shrink-0 mt-0.5" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#64748B] font-bold">
        {upgrade.label}: {upgrade.price} · Volume discount 30–40% cho chuỗi hệ thống
      </p>
    </div>
  )
}
