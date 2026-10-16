import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type AdminBillingSettings, type AdminB2b2cInquiry, type AdminRecentPayment } from '../features/admin/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { clearAdminDraft, readAdminDraft, shouldPreserveAdminDraft, writeAdminDraft } from '../features/admin/state'
import { useAuth } from '../shared/auth/useAuth'

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${value.toLocaleString('vi-VN')}đ`
}

const INQUIRY_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'] as const
const SLA_HOURS = 48
const BILLING_ROUTE = '/admin/billing'
const BILLING_SETTINGS_FORM_ID = 'settings:runtime'

type BillingSettingsDraft = {
  priceInput: string
  dailyLimitInput: string
  volumeDiscountInput: string
  volumeMinLicensesInput: string
}

function inquirySlaLabel(item: AdminB2b2cInquiry): { text: string; overdue: boolean } {
  if (item.status !== 'NEW') {
    return { text: item.contactedAt ? `Đã liên hệ ${new Date(item.contactedAt).toLocaleString('vi-VN')}` : item.status, overdue: false }
  }
  const ageH = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60)
  const overdue = ageH > SLA_HOURS
  return {
    text: overdue ? `SLA quá hạn (${Math.floor(ageH)}h)` : `SLA ≤${SLA_HOURS}h · còn ${Math.max(0, Math.ceil(SLA_HOURS - ageH))}h`,
    overdue,
  }
}

export function AdminBillingPage() {
  const [settings, setSettings] = useState<AdminBillingSettings | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [dailyLimitInput, setDailyLimitInput] = useState('10')
  const [volumeDiscountInput, setVolumeDiscountInput] = useState('35')
  const [volumeMinLicensesInput, setVolumeMinLicensesInput] = useState('3')
  const [loading, setLoading] = useState(true)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [inquiries, setInquiries] = useState<AdminB2b2cInquiry[]>([])
  const [inquiriesLoading, setInquiriesLoading] = useState(true)
  const [inquiriesError, setInquiriesError] = useState<string | null>(null)
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>('')
  const [recentPayments, setRecentPayments] = useState<AdminRecentPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const { showToast } = useToast()
  const { user } = useAuth()
  const userId = user?.id

  const inquiryDraftFormId = (id: string) => `inquiry:${id}:status`
  const inquiryStatus = (item: AdminB2b2cInquiry) => {
    if (!userId || typeof sessionStorage === 'undefined') return item.status
    return readAdminDraft<{ status?: string }>(
      sessionStorage,
      userId,
      BILLING_ROUTE,
      inquiryDraftFormId(item.id),
    )?.status ?? item.status
  }

  const load = () => {
    setLoading(true)
    setSettingsError(null)
    adminApi
      .getBillingSettings()
      .then((data) => {
        setSettings(data)
        const draft = userId && typeof sessionStorage !== 'undefined'
          ? readAdminDraft<BillingSettingsDraft>(sessionStorage, userId, BILLING_ROUTE, BILLING_SETTINGS_FORM_ID)
          : null
        setPriceInput(draft?.priceInput ?? String(data.b2cPremiumPriceVnd))
        setDailyLimitInput(draft?.dailyLimitInput ?? String(data.chatFreeDailyLimit))
        setVolumeDiscountInput(draft?.volumeDiscountInput ?? String(data.orgVolumeDiscountPercent ?? 35))
        setVolumeMinLicensesInput(draft?.volumeMinLicensesInput ?? String(data.orgVolumeDiscountMinLicenses ?? 3))
      })
      .catch((cause) => setSettingsError(getFriendlyErrorMessage(cause, 'quest')))
      .finally(() => setLoading(false))
  }

  const loadInquiries = () => {
    setInquiriesLoading(true)
    setInquiriesError(null)
    adminApi
      .listB2b2cInquiries()
      .then(setInquiries)
      .catch((cause) => setInquiriesError(getFriendlyErrorMessage(cause, 'quest')))
      .finally(() => setInquiriesLoading(false))
  }

  const loadPayments = () => {
    setPaymentsLoading(true)
    setPaymentsError(null)
    adminApi
      .listRecentPayments()
      .then(setRecentPayments)
      .catch((cause) => setPaymentsError(getFriendlyErrorMessage(cause, 'quest')))
      .finally(() => setPaymentsLoading(false))
  }

  useEffect(() => {
    load()
    loadPayments()
  }, [])

  useEffect(() => {
    loadInquiries()
  }, [])

  const parsedPrice = useMemo(() => Number(priceInput.replace(/[^\d]/g, '')), [priceInput])
  const parsedDailyLimit = useMemo(() => Number(dailyLimitInput), [dailyLimitInput])
  const parsedVolumeDiscount = useMemo(() => Number(volumeDiscountInput), [volumeDiscountInput])
  const parsedVolumeMinLicenses = useMemo(() => Number(volumeMinLicensesInput), [volumeMinLicensesInput])
  const visibleInquiries = useMemo(
    () => inquiries.filter((item) => !inquiryStatusFilter || item.status === inquiryStatusFilter),
    [inquiries, inquiryStatusFilter],
  )
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
      if (userId && typeof sessionStorage !== 'undefined') {
        clearAdminDraft(sessionStorage, userId, BILLING_ROUTE, BILLING_SETTINGS_FORM_ID)
      }
      showToast({ message: 'Đã cập nhật cài đặt billing runtime.', type: 'success' })
    } catch (e) {
      if (userId && typeof sessionStorage !== 'undefined' && shouldPreserveAdminDraft(e)) {
        writeAdminDraft<BillingSettingsDraft>(sessionStorage, userId, BILLING_ROUTE, BILLING_SETTINGS_FORM_ID, {
          priceInput,
          dailyLimitInput,
          volumeDiscountInput,
          volumeMinLicensesInput,
        })
      }
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast({ message: `Đã copy ${label}`, type: 'success' })
    } catch {
      showToast({ message: text, type: 'info' })
    }
  }

  const patchInquiryStatus = async (id: string, status: string) => {
    const formId = inquiryDraftFormId(id)
    try {
      await adminApi.updateB2b2cInquiryStatus(id, status)
      if (userId && typeof sessionStorage !== 'undefined') {
        clearAdminDraft(sessionStorage, userId, BILLING_ROUTE, formId)
      }
      showToast({ message: 'Đã cập nhật trạng thái', type: 'success' })
      loadInquiries()
    } catch (e) {
      if (userId && typeof sessionStorage !== 'undefined' && shouldPreserveAdminDraft(e)) {
        writeAdminDraft(sessionStorage, userId, BILLING_ROUTE, formId, { status })
      }
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    }
  }

  return (
      <section className="max-w-5xl w-full space-y-md">
        <div>
          <div>
            <h1 className="font-display-md text-on-surface">Billing settings</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Điều chỉnh giá B2C Premium runtime và xem cấu hình QR/account đang được publish từ backend.
            </p>
          </div>
        </div>

        {loading && <AdminLoading label="Đang tải cấu hình billing" />}
        {!loading && settingsError && <AdminErrorState message={settingsError} onRetry={load} />}

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
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <h2 className="font-title-md">Thanh toán gần đây</h2>
                <span className="text-xs text-on-surface-variant">GET /api/admin/billing/payments/recent</span>
              </div>
              {paymentsLoading ? (
                <AdminLoading label="Đang tải thanh toán gần đây" />
              ) : paymentsError ? (
                <AdminErrorState message={paymentsError} onRetry={loadPayments} />
              ) : recentPayments.length === 0 ? (
                <AdminEmptyState title="Chưa có thanh toán" detail="Không có giao dịch nào trong khoảng dữ liệu gần đây." />
              ) : (
                <ul className="space-y-sm text-sm">
                  {recentPayments.map((p, index) => (
                    <li key={p.id ?? p.orderCode ?? `${p.createdAt}-${index}`} className="flex flex-wrap justify-between gap-2 border-b border-outline-variant/40 pb-sm">
                      <span className="font-mono text-xs">{p.orderCode}</span>
                      <span>{formatCurrency(p.amountVnd)} · {p.status}</span>
                      <span className="text-on-surface-variant text-xs w-full">
                        {p.payerEmail ?? '—'} · {new Date(p.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
              <div className="flex flex-wrap items-center gap-sm justify-between">
                <div>
                  <h2 className="font-title-md">B2B2C inquiries (CRM)</h2>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Lead thương mại · SLA NEW → CONTACTED ≤ {SLA_HOURS}h · Báo lỗi nội dung factual →{' '}
                    <Link to="/admin/content" className="text-secondary underline">
                      Admin Nội dung
                    </Link>
                  </p>
                </div>
                <label className="text-sm flex items-center gap-2">
                  Lọc trạng thái
                  <select
                    value={inquiryStatusFilter}
                    onChange={(e) => setInquiryStatusFilter(e.target.value)}
                    className="rounded-lg border border-outline-variant bg-surface px-sm py-1"
                  >
                    <option value="">Tất cả</option>
                    {INQUIRY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {inquiriesLoading ? (
                <AdminLoading label="Đang tải yêu cầu B2B2C" />
              ) : inquiriesError ? (
                <AdminErrorState message={inquiriesError} onRetry={loadInquiries} />
              ) : visibleInquiries.length === 0 ? (
                <AdminEmptyState title="Chưa có yêu cầu phù hợp" detail="Không có yêu cầu số hóa di tích ở trạng thái đã chọn." />
              ) : (
                <ul className="space-y-sm text-sm">
                  {visibleInquiries.map((item) => (
                    <li key={item.id} className="border border-outline-variant/40 rounded-lg p-sm space-y-2">
                      <p className="font-medium text-on-surface">{item.siteName}</p>
                      <p className="text-on-surface-variant">
                        {item.contactName} · {item.packageType}
                        {item.interestSiteCode ? ` · pilot ${item.interestSiteCode}` : ''} ·{' '}
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </p>
                      {(() => {
                        const sla = inquirySlaLabel(item)
                        return (
                          <p
                            className={`text-xs font-bold ${sla.overdue ? 'text-red-400' : 'text-on-surface-variant'}`}
                            data-testid="inquiry-sla"
                          >
                            {sla.text}
                          </p>
                        )
                      })()}
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          className="text-secondary underline text-xs"
                          onClick={() => void copyText(item.contactEmail, 'email')}
                        >
                          {item.contactEmail}
                        </button>
                        {item.contactPhone && (
                          <button
                            type="button"
                            className="text-secondary underline text-xs"
                            onClick={() => void copyText(item.contactPhone!, 'SĐT')}
                          >
                            {item.contactPhone}
                          </button>
                        )}
                        <select
                          value={inquiryStatus(item)}
                          onChange={(e) => void patchInquiryStatus(item.id, e.target.value)}
                          className="ml-auto rounded border border-outline-variant bg-surface px-2 py-1 text-xs"
                        >
                          {INQUIRY_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          {!INQUIRY_STATUSES.includes(item.status as (typeof INQUIRY_STATUSES)[number]) && (
                            <option value={item.status}>{item.status}</option>
                          )}
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>
  )
}
