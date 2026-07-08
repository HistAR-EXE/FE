import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { billingApi, type OrgPlanInfo } from '../features/billing/api'
import { useToast } from '../shared/ui/toast/useToast'

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('vi-VN')}đ`
}

function formatAi(limit: number | null) {
  return limit == null ? 'Không giới hạn' : `${limit.toLocaleString('vi-VN')}/tháng`
}

const B2B_FEATURES: Record<string, string[]> = {
  MICRO: ['Master Account cơ bản (roster, cấp account)', 'Học sinh hưởng B2C Premium'],
  STANDARD: [
    'Master Account + theo dõi tiến độ quest',
    'Team-based Quest Room (học nhóm theo mã phòng)',
    'Học sinh hưởng B2C Premium',
  ],
  PREMIUM: [
    'LMS đầy đủ: giao bài, auto-chấm, báo cáo',
    'Master Account + Team-based Quest Room',
    'Học sinh 100% tính năng',
  ],
}

export function PricingPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const [b2cPrice, setB2cPrice] = useState(49_000)
  const [chatDailyLimit, setChatDailyLimit] = useState(10)
  const [orgPlans, setOrgPlans] = useState<OrgPlanInfo[]>([])
  const [trialLoading, setTrialLoading] = useState(false)
  const next = searchParams.get('next')
  const checkoutB2cHref = next ? `/checkout/b2c?next=${encodeURIComponent(next)}` : '/checkout/b2c'
  const checkoutB2bHref = (planId: string) =>
    next
      ? `/checkout/b2b?plan=${planId}&next=${encodeURIComponent(next)}`
      : `/checkout/b2b?plan=${planId}`

  useEffect(() => {
    billingApi
      .getPublicPricing()
      .then((data) => {
        setB2cPrice(data.b2cPremiumPriceVnd)
        setChatDailyLimit(data.chatFreeDailyLimit ?? 10)
        setOrgPlans(data.orgPlans)
      })
      .catch(() => undefined)
  }, [])

  const plans = useMemo(
    () =>
      orgPlans.map((plan) => ({
        ...plan,
        hero: plan.planType === 'STANDARD',
        cta: plan.planType === 'STANDARD' ? 'Triển khai gói tiêu chuẩn' : 'Đăng ký cấp phép gói',
        extras: B2B_FEATURES[plan.planType] ?? [],
      })),
    [orgPlans],
  )

  const createClassroomTrial = async () => {
    try {
      setTrialLoading(true)
      const trialName = `Classroom Trial ${new Date().toLocaleDateString('vi-VN')}`
      await billingApi.createOrgTrial({ orgName: trialName })
      showToast({ message: 'Đã tạo lớp học dùng thử 14 ngày', type: 'success' })
      navigate('/teacher')
    } catch {
      showToast({ message: 'Không thể tạo lớp học dùng thử. Vui lòng kiểm tra điều kiện tài khoản.', type: 'error' })
    } finally {
      setTrialLoading(false)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Bảng giá" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-lg">
        <header className="text-center space-y-sm">
          <h1 className="font-display-md text-on-surface">Gói TimeLens / HistAR</h1>
          <p className="text-sm text-on-surface-variant max-w-2xl mx-auto">
            Freemium cho cá nhân · License SaaS cho trường học · Thanh toán QR qua payment gateway + webhook HMAC.
          </p>
        </header>

        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <h2 className="font-title-md flex items-center gap-sm">
            <MaterialIcon name="person" className="text-primary" />
            B2C — Cá nhân
          </h2>
          <div className="grid md:grid-cols-2 gap-md">
            <div className="rounded-xl border border-outline-variant p-md space-y-sm">
              <p className="text-xs uppercase text-on-surface-variant">FREE</p>
              <p className="text-2xl font-bold">0đ</p>
              <ul className="text-sm text-on-surface-variant space-y-1">
                <li>Tour 360° & Explore — không gate (viral)</li>
                <li>Time Portal chỉ era 2026</li>
                <li>{chatDailyLimit} câu AI/ngày — không có nguồn trích dẫn</li>
                <li>Gamification cơ bản (XP, quest)</li>
                <li>2 theme photo frame</li>
              </ul>
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-md space-y-sm">
              <p className="text-xs uppercase text-primary">PREMIUM — USP</p>
              <p className="text-2xl font-bold">{formatCurrency(b2cPrice)}/tháng</p>
              <ul className="text-sm text-on-surface-variant space-y-1">
                <li>Time Portal đủ 3 era: 1948 · 1968 · 2026</li>
                <li>Chat AI không giới hạn + nguồn trích dẫn</li>
                <li>Gamification toàn diện: Rankings, Passport, Badges</li>
                <li>Tất cả photo frame + badge Premium</li>
              </ul>
              <Link to={checkoutB2cHref}>
                <Button type="button" className="w-full mt-sm">
                  Nâng cấp Premium
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="b2b" className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <h2 className="font-title-md flex items-center gap-sm">
              <MaterialIcon name="school" className="text-secondary" />
              B2B — Trường học
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void createClassroomTrial()}
                disabled={trialLoading}
                className="text-xs px-sm py-xs rounded-full border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-60"
              >
                {trialLoading ? 'Đang tạo trial...' : 'Dùng thử lớp học 14 ngày'}
              </button>
              <span className="text-xs px-sm py-xs rounded-full bg-secondary/10 text-secondary border border-secondary/30">
                Volume Discount 30–40% khi mua ≥3 license
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-md">
            {plans.map((plan) => (
              <div
                key={plan.planType}
                className={`rounded-xl border p-md space-y-sm ${
                  plan.hero ? 'border-secondary bg-secondary/5' : 'border-outline-variant'
                }`}
              >
                {plan.hero && (
                  <span className="text-xs font-medium text-secondary uppercase">Hero Product</span>
                )}
                {plan.planType === 'STANDARD' && (
                  <span className="text-[10px] font-bold text-secondary uppercase">+ Team-based Quest Room</span>
                )}
                <p className="font-title-md">{plan.label}</p>
                <p className="text-lg font-bold">{formatCurrency(plan.priceVnd)}/năm</p>
                <ul className="text-sm text-on-surface-variant space-y-1">
                  <li>CCU: {plan.maxCcu}</li>
                  <li>Tối đa {plan.maxVerifiedAccounts} tài khoản</li>
                  <li>AI: {formatAi(plan.maxAiQueriesPerMonth)}</li>
                  {plan.extras.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <Link to={checkoutB2bHref(plan.planType) + (plan.planType === 'STANDARD' ? '&licenses=3' : '')}>
                  <Button type="button" variant={plan.hero ? 'primary' : 'outline'} className="w-full mt-sm">
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section id="b2b2c" className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <h2 className="font-title-md flex items-center gap-sm">
            <MaterialIcon name="museum" className="text-primary" />
            B2B2C — Số hóa di tích
          </h2>
          <p className="text-sm text-on-surface-variant">
            Ban quản lý di tích / museum: panorama 360°, quest AR, nhân vật AI — one-time từ 50.000.000đ/site hoặc OpEx
            250.000.000đ/năm.
          </p>
          <Link to="/checkout/b2b2c">
            <Button type="button" variant="outline">
              Gửi yêu cầu tư vấn
            </Button>
          </Link>
        </section>
      </main>
    </AppLayout>
  )
}
