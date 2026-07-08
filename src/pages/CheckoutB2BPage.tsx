import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { billingApi } from '../features/billing/api'
import { profileApi } from '../features/profile/api'
import { EmailVerificationBanner } from '../components/auth/EmailVerificationBanner'
import { useAuth } from '../shared/auth/useAuth'
import { isSafeRedirect } from '../shared/auth/types'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

const PLANS = ['MICRO', 'STANDARD', 'PREMIUM'] as const

export function CheckoutB2BPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [orgName, setOrgName] = useState(user?.orgName ?? '')
  const [contactEmail, setContactEmail] = useState(user?.email ?? '')
  const [planType, setPlanType] = useState(
    PLANS.includes((searchParams.get('plan') ?? '').toUpperCase() as (typeof PLANS)[number])
      ? (searchParams.get('plan')!.toUpperCase() as (typeof PLANS)[number])
      : 'STANDARD',
  )
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [payment, setPayment] = useState<Awaited<ReturnType<typeof billingApi.createOrgPayment>> | null>(null)
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | null>(null)
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({})
  const [licenseCount, setLicenseCount] = useState(
    Math.max(1, Number.parseInt(searchParams.get('licenses') ?? '1', 10) || 1),
  )
  const [volumePreview, setVolumePreview] = useState<Awaited<ReturnType<typeof billingApi.getOrgVolumePreview>> | null>(
    null,
  )
  const [emailVerified, setEmailVerified] = useState<boolean | undefined>(undefined)
  const returnTo = useMemo(() => {
    const next = searchParams.get('next')
    return next && isSafeRedirect(next) ? next : '/teacher'
  }, [searchParams])

  useEffect(() => {
    profileApi
      .me()
      .then((p) => setEmailVerified(p.emailVerified === true))
      .catch(() => setEmailVerified(undefined))
  }, [])

  useEffect(() => {
    billingApi
      .getOrgPlans()
      .then((plans) =>
        setPlanPrices(
          plans.reduce<Record<string, number>>((acc, item) => {
            acc[item.planType] = item.priceVnd
            return acc
          }, {}),
        ),
      )
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    billingApi
      .getOrgVolumePreview(planType, licenseCount)
      .then(setVolumePreview)
      .catch(() => setVolumePreview(null))
  }, [planType, licenseCount])

  const completeUpgrade = async (nextPath: string) => {
    const profile = await profileApi.me()
    updateUser({
      tier: profile.tier,
      orgId: profile.orgId,
      orgName: profile.orgName,
      orgSubscription: profile.orgSubscription,
      orgRole: profile.orgRole,
      role: profile.role,
    })
    showToast({ message: `Thanh toán ${planType} thành công và đã kích hoạt license tổ chức`, type: 'success' })
    navigate(nextPath)
  }

  const refreshPaymentStatus = async (orderCode: string, silent = false) => {
    try {
      if (!silent) setChecking(true)
      const nextStatus = await billingApi.getOrgPaymentStatus(orderCode)
      setStatus(nextStatus.status)
      if (nextStatus.status === 'PAID' && nextStatus.activated) {
        await completeUpgrade(nextStatus.returnToPath || returnTo)
      }
    } catch (e) {
      if (!silent) {
        showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      }
    } finally {
      if (!silent) setChecking(false)
    }
  }

  const handleCheckout = async () => {
    if (!orgName.trim()) {
      showToast({ message: 'Nhập tên trường/tổ chức', type: 'error' })
      return
    }
    try {
      setLoading(true)
      const result = await billingApi.createOrgPayment({
        orgName: orgName.trim(),
        planType,
        contactEmail: contactEmail.trim(),
        organizationId: user?.orgId ?? undefined,
        returnToPath: returnTo,
        licenseCount,
      })
      setPayment(result)
      setStatus(result.status)
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!payment || status === 'PAID' || status === 'EXPIRED' || status === 'FAILED') return
    const timer = window.setInterval(() => {
      void refreshPaymentStatus(payment.orderCode, true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [payment, status])

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Thanh toán B2B" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-lg mx-auto w-full">
        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <h1 className="font-title-md">Đăng ký license trường học</h1>
          <p className="text-sm text-on-surface-variant">SePay QR tự đồng bộ sau khi backend nhận webhook và kích hoạt license.</p>
          <label className="block text-sm space-y-1">
            Tên trường / tổ chức
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
              placeholder="THPT Nguyễn Du"
            />
          </label>
          <label className="block text-sm space-y-1">
            Email liên hệ
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
              placeholder="giaovien@truong.edu.vn"
            />
          </label>
          <label className="block text-sm space-y-1">
            Gói
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as (typeof PLANS)[number])}
              className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
            >
              <option value="MICRO">Micro — {(planPrices.MICRO ?? 8_000_000).toLocaleString('vi-VN')}đ/năm</option>
              <option value="STANDARD">Standard — {(planPrices.STANDARD ?? 15_000_000).toLocaleString('vi-VN')}đ/năm</option>
              <option value="PREMIUM">Premium — {(planPrices.PREMIUM ?? 25_000_000).toLocaleString('vi-VN')}đ/năm</option>
            </select>
          </label>
          <label className="block text-sm space-y-1">
            Số license (trường/cụm)
            <input
              type="number"
              min={1}
              max={99}
              value={licenseCount}
              onChange={(e) => setLicenseCount(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
              className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
            />
            {volumePreview && volumePreview.discountPercent > 0 && (
              <p className="text-xs text-secondary">
                Volume discount {volumePreview.discountPercent}% — tiết kiệm{' '}
                {volumePreview.discountAmountVnd.toLocaleString('vi-VN')}đ
              </p>
            )}
            {volumePreview && (
              <p className="text-xs text-on-surface-variant">
                Tạm tính: {volumePreview.subtotalVnd.toLocaleString('vi-VN')}đ →{' '}
                <strong className="text-on-surface">{volumePreview.totalVnd.toLocaleString('vi-VN')}đ</strong>
              </p>
            )}
          </label>
          <EmailVerificationBanner
            emailVerified={emailVerified}
            onVerified={() => setEmailVerified(true)}
          />
          {payment && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-high p-md space-y-sm">
              <div className="flex items-start justify-between gap-sm">
                <div>
                  <p className="text-sm font-medium">Mã thanh toán: {payment.orderCode}</p>
                  <p className="text-xs text-on-surface-variant">Nội dung CK: {payment.transferContent}</p>
                </div>
                <span className="rounded-full bg-secondary/10 px-sm py-1 text-xs font-medium text-secondary">
                  {status === 'PAID' ? 'Đã thanh toán' : status === 'EXPIRED' ? 'Đã hết hạn' : 'Chờ thanh toán'}
                </span>
              </div>
              <img
                src={payment.qrUrl}
                alt={`SePay QR ${payment.orderCode}`}
                className="mx-auto h-56 w-56 rounded-lg border border-outline-variant bg-white object-contain p-sm"
              />
              <div className="grid grid-cols-1 gap-sm text-sm text-on-surface-variant">
                <p>Ngân hàng: <span className="text-on-surface font-medium">{payment.bankCode}</span></p>
                <p>Số tài khoản: <span className="text-on-surface font-medium">{payment.accountNumber}</span></p>
                <p>Chủ tài khoản: <span className="text-on-surface font-medium">{payment.accountName}</span></p>
                <p>Số tiền: <span className="text-on-surface font-medium">{payment.amountVnd.toLocaleString('vi-VN')}đ</span></p>
              </div>
              <p className="text-xs text-on-surface-variant">
                Khi backend nhận webhook SePay đúng nội dung, gói tổ chức sẽ tự kích hoạt cho tài khoản giáo viên. Trang này cũng tự kiểm tra lại trạng thái mỗi 5 giây.
              </p>
              <p className="text-xs text-on-surface-variant">
                Local: cần webhook public/tunnel hoặc test hook/manual mock để backend biết giao dịch đã trả. Deploy: backend public sẽ nhận webhook SePay, nút này chỉ dùng để refresh nếu webhook tới chậm.
              </p>
            </div>
          )}
          <div className="flex gap-sm pt-md">
            <Link to="/pricing#b2b" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Quay lại
              </Button>
            </Link>
            {!payment ? (
              <Button type="button" className="flex-1" disabled={loading || emailVerified !== true} onClick={() => void handleCheckout()}>
                {loading ? 'Đang tạo QR...' : 'Tạo thanh toán SePay'}
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1"
                disabled={checking || status === 'PAID'}
                onClick={() => void refreshPaymentStatus(payment.orderCode)}
              >
                {checking ? 'Đang kiểm tra...' : status === 'PAID' ? 'Đã xác nhận' : 'Kiểm tra lại trạng thái'}
              </Button>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  )
}
