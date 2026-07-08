import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminSubNav } from '../components/admin/AdminSubNav'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { adminApi, type AdminBillingSettings } from '../features/admin/api'
import { billingApi } from '../features/billing/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`
}

export function AdminBillingPage() {
  const [settings, setSettings] = useState<AdminBillingSettings | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [dailyLimitInput, setDailyLimitInput] = useState('10')
  const [volumeDiscountInput, setVolumeDiscountInput] = useState('35')
  const [volumeMinLicensesInput, setVolumeMinLicensesInput] = useState('3')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inquiries, setInquiries] = useState<Awaited<ReturnType<typeof billingApi.listB2b2cInquiries>>>([])
  const { showToast } = useToast()

  const load = () => {
    setLoading(true)
    adminApi
      .getBillingSettings()
      .then((data) => {
        setSettings(data)
        setPriceInput(String(data.b2cPremiumPriceVnd))
        setDailyLimitInput(String(data.chatFreeDailyLimit))
        setVolumeDiscountInput(String(data.orgVolumeDiscountPercent ?? 35))
        setVolumeMinLicensesInput(String(data.orgVolumeDiscountMinLicenses ?? 3))
      })
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    billingApi.listB2b2cInquiries().then(setInquiries).catch(() => setInquiries([]))
  }, [])

  const parsedPrice = useMemo(() => Number(priceInput.replace(/[^\d]/g, '')), [priceInput])
  const parsedDailyLimit = useMemo(() => Number(dailyLimitInput), [dailyLimitInput])
  const parsedVolumeDiscount = useMemo(() => Number(volumeDiscountInput), [volumeDiscountInput])
  const parsedVolumeMinLicenses = useMemo(() => Number(volumeMinLicensesInput), [volumeMinLicensesInput])
  const isDirty = settings
    ? parsedPrice !== settings.b2cPremiumPriceVnd ||
      parsedDailyLimit !== settings.chatFreeDailyLimit ||
      parsedVolumeDiscount !== (settings.orgVolumeDiscountPercent ?? 35) ||
      parsedVolumeMinLicenses !== (settings.orgVolumeDiscountMinLicenses ?? 3)
    : false
  const isValid =
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 1000 &&
    Number.isFinite(parsedDailyLimit) &&
    parsedDailyLimit >= 5 &&
    parsedDailyLimit <= 10 &&
    Number.isFinite(parsedVolumeDiscount) &&
    parsedVolumeDiscount >= 1 &&
    parsedVolumeDiscount <= 50 &&
    Number.isFinite(parsedVolumeMinLicenses) &&
    parsedVolumeMinLicenses >= 2 &&
    parsedVolumeMinLicenses <= 20

  const handleSave = async () => {
    if (!isValid) {
      showToast({ message: 'Giá B2C tối thiểu 1.000đ; giới hạn chat FREE từ 5–10/ngày.', type: 'error' })
      return
    }
    try {
      setSaving(true)
      const next = await adminApi.updateBillingSettings({
        b2cPremiumPriceVnd: parsedPrice,
        chatFreeDailyLimit: parsedDailyLimit,
        orgVolumeDiscountPercent: parsedVolumeDiscount,
        orgVolumeDiscountMinLicenses: parsedVolumeMinLicenses,
      })
      setSettings(next)
      setPriceInput(String(next.b2cPremiumPriceVnd))
      setDailyLimitInput(String(next.chatFreeDailyLimit))
      setVolumeDiscountInput(String(next.orgVolumeDiscountPercent))
      setVolumeMinLicensesInput(String(next.orgVolumeDiscountMinLicenses))
      showToast({ message: 'Đã cập nhật cài đặt billing runtime.', type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Billing settings" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        <div className="flex items-center justify-between gap-sm">
          <div>
            <h1 className="font-display-md text-on-surface">Billing settings</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Điều chỉnh giá B2C Premium runtime và xem cấu hình QR/account đang được publish từ backend.
            </p>
          </div>
          <Link to="/profile" className="text-secondary inline-flex items-center gap-1 text-sm hover:underline">
            <MaterialIcon name="arrow_back" className="text-sm" /> Hồ sơ
          </Link>
        </div>

        <AdminSubNav />

        {loading && <div className="h-48 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />}

        {!loading && settings && (
          <>
            <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg space-y-md">
              <div className="flex items-center justify-between gap-sm">
                <div>
                  <h2 className="font-title-md text-on-surface">B2C Premium price</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Giá này là nguồn runtime cho `PricingPage`, `CheckoutB2CPage`, và SePay payment intent.
                  </p>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-sm py-1 text-xs font-medium text-primary">
                  Live runtime
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-md">
                <label className="block text-sm space-y-1">
                  Giá Premium B2C (VND / tháng)
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                    placeholder="49000"
                  />
                </label>
                <label className="block text-sm space-y-1">
                  Giới hạn chat FREE (5–10 / ngày)
                  <input
                    type="number"
                    min={5}
                    max={10}
                    value={dailyLimitInput}
                    onChange={(e) => setDailyLimitInput(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                  />
                </label>
                <label className="block text-sm space-y-1">
                  Volume discount B2B (%)
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={volumeDiscountInput}
                    onChange={(e) => setVolumeDiscountInput(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                  />
                </label>
                <label className="block text-sm space-y-1">
                  Số license tối thiểu để giảm giá
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={volumeMinLicensesInput}
                    onChange={(e) => setVolumeMinLicensesInput(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-high p-md space-y-2">
                  <p className="text-xs uppercase text-on-surface-variant">Preview</p>
                  <p className="text-2xl font-bold text-on-surface">
                    {isValid ? `${formatCurrency(parsedPrice)}/tháng` : 'Giá không hợp lệ'}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Giá hiện tại từ backend: <span className="font-medium text-on-surface">{formatCurrency(settings.b2cPremiumPriceVnd)}</span>
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Chat FREE: <span className="font-medium text-on-surface">{settings.chatFreeDailyLimit}/ngày</span>
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Volume discount: <span className="font-medium text-on-surface">{settings.orgVolumeDiscountPercent ?? 35}% từ {settings.orgVolumeDiscountMinLicenses ?? 3} license</span>
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString('vi-VN') : 'Chưa có'}
                  </p>
                </div>

              <div className="flex flex-wrap gap-sm">
                <button
                  type="button"
                  onClick={() => {
                    setPriceInput(String(settings.b2cPremiumPriceVnd))
                    setDailyLimitInput(String(settings.chatFreeDailyLimit))
                    setVolumeDiscountInput(String(settings.orgVolumeDiscountPercent ?? 35))
                    setVolumeMinLicensesInput(String(settings.orgVolumeDiscountMinLicenses ?? 3))
                  }}
                  disabled={saving || !isDirty}
                  className="inline-flex items-center gap-1 px-md py-sm border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-high disabled:opacity-60"
                >
                  Hoàn tác
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !isDirty || !isValid}
                  className="inline-flex items-center gap-1 px-md py-sm border border-primary text-primary rounded-lg hover:bg-primary/10 disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : 'Lưu giá mới'}
                </button>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-md">
              <div className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
                <h2 className="font-title-md">QR/account config</h2>
                <div className="space-y-2 text-sm text-on-surface-variant">
                  <p>
                    Ngân hàng: <span className="font-medium text-on-surface">{settings.bankCode}</span>
                  </p>
                  <p>
                    Số tài khoản: <span className="font-medium text-on-surface">{settings.accountNumber}</span>
                  </p>
                  <p>
                    Chủ tài khoản: <span className="font-medium text-on-surface">{settings.accountName}</span>
                  </p>
                  <p>
                    Template: <span className="font-medium text-on-surface">{settings.qrTemplate}</span>
                  </p>
                  <p>
                    Show info: <span className="font-medium text-on-surface">{settings.qrShowInfo ? 'true' : 'false'}</span>
                  </p>
                </div>
              </div>

              <div className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
                <h2 className="font-title-md">Ghi chú vận hành</h2>
                <ul className="text-sm text-on-surface-variant space-y-2">
                  <li>Giá mới sẽ áp dụng cho payment intent mới, không sửa giao dịch đã tạo trước đó.</li>
                  <li>QR/account config hiện đang hiển thị read-only để tránh chỉnh sai cấu hình nhận tiền trực tiếp trên UI.</li>
                  <li>Có thể mở rộng màn này sau cho khuyến mãi, effective date, hoặc QR/account override nếu cần.</li>
                </ul>
              </div>
            </section>

            <section className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
              <h2 className="font-title-md">B2B2C inquiries</h2>
              {inquiries.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có yêu cầu số hóa di tích.</p>
              ) : (
                <ul className="space-y-sm text-sm">
                  {inquiries.map((item) => (
                    <li key={item.id} className="border-b border-outline-variant/40 pb-sm">
                      <p className="font-medium text-on-surface">{item.siteName}</p>
                      <p className="text-on-surface-variant">
                        {item.contactName} · {item.contactEmail} · {item.packageType} · {item.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}
