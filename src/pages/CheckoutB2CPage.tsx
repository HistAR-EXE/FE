import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isSafeRedirect } from '../shared/auth/types'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { billingApi } from '../features/billing/api'
import { profileApi } from '../features/profile/api'
import { EmailVerificationBanner } from '../components/auth/EmailVerificationBanner'
import { useAuth } from '../shared/auth/useAuth'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

export function CheckoutB2CPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [payment, setPayment] = useState<Awaited<ReturnType<typeof billingApi.createB2CPayment>> | null>(null)
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | null>(null)
  const [priceVnd, setPriceVnd] = useState(49_000)
  const [emailVerified, setEmailVerified] = useState<boolean | undefined>(undefined)
  const returnTo = useMemo(() => {
    const next = searchParams.get('next')
    return next && isSafeRedirect(next) ? next : '/settings'
  }, [searchParams])

  useEffect(() => {
    billingApi
      .getPublicPricing()
      .then((data) => setPriceVnd(data.b2cPremiumPriceVnd))
      .catch(() => undefined)
    profileApi
      .me()
      .then((p) => setEmailVerified(p.emailVerified === true))
      .catch(() => setEmailVerified(undefined))
  }, [])

  const completeUpgrade = async (nextPath: string) => {
    const profile = await profileApi.me()
    updateUser({
      tier: profile.tier,
      orgId: profile.orgId,
      orgSubscription: profile.orgSubscription,
      role: profile.role,
    })
    showToast({ message: 'Thanh toán thành công. Premium đã được kích hoạt!', type: 'success' })
    navigate(nextPath)
  }

  const refreshPaymentStatus = async (orderCode: string, silent = false) => {
    try {
      if (!silent) setChecking(true)
      const nextStatus = await billingApi.getB2CPaymentStatus(orderCode)
      setStatus(nextStatus.status)
      if (nextStatus.status === 'PAID' && nextStatus.upgraded) {
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
    if (loading) return
    try {
      setLoading(true)
      const next = await billingApi.createB2CPayment(returnTo)
      setPayment(next)
      setStatus(next.status)
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
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Thanh toán B2C" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-lg mx-auto w-full">
        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <h1 className="font-title-md">Premium Individual</h1>
          <p className="text-sm text-on-surface-variant">
            {priceVnd.toLocaleString('vi-VN')}đ/tháng · SePay QR tự đồng bộ sau khi backend nhận webhook
          </p>
          <ul className="text-sm text-on-surface-variant space-y-1 border-t border-outline-variant pt-md">
            <li>Chat AI không giới hạn</li>
            <li>Time Portal 3 era</li>
            <li>Photo frame Premium</li>
          </ul>
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
                <span className="rounded-full bg-primary/10 px-sm py-1 text-xs font-medium text-primary">
                  {status === 'PAID' ? 'Đã thanh toán' : status === 'EXPIRED' ? 'Đã hết hạn' : 'Chờ thanh toán'}
                </span>
              </div>
              <img src={payment.qrUrl} alt={`SePay QR ${payment.orderCode}`} className="mx-auto h-56 w-56 rounded-lg border border-outline-variant bg-white object-contain p-sm" />
              <div className="grid grid-cols-1 gap-sm text-sm text-on-surface-variant">
                <p>Ngân hàng: <span className="text-on-surface font-medium">{payment.bankCode}</span></p>
                <p>Số tài khoản: <span className="text-on-surface font-medium">{payment.accountNumber}</span></p>
                <p>Chủ tài khoản: <span className="text-on-surface font-medium">{payment.accountName}</span></p>
                <p>Số tiền: <span className="text-on-surface font-medium">{payment.amountVnd.toLocaleString('vi-VN')}đ</span></p>
              </div>
              <p className="text-xs text-on-surface-variant">
                Hệ thống sẽ tự mở khóa Premium sau khi webhook SePay tới backend. Trang này cũng tự kiểm tra lại trạng thái mỗi 5 giây.
              </p>
              <p className="text-xs text-on-surface-variant">
                Local: cần webhook public/tunnel hoặc test hook để backend nhận thanh toán. Deploy: backend public sẽ nhận webhook SePay, còn nút bên dưới chỉ dùng để refresh nếu webhook tới chậm.
              </p>
            </div>
          )}
          <div className="flex gap-sm pt-md">
            <Link to={searchParams.get('from') === 'pricing' ? '/pricing' : '/pricing'} className="flex-1">
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
