import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminChart } from '../components/admin/AdminChart'
import { useAdminChartAnimation } from '../components/admin/adminChartMotion'
import { AdminEmptyState, AdminErrorState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPagination } from '../components/admin/AdminPagination'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import {
  adminApi,
  type AdminB2b2cInquiry,
  type AdminBillingOverview,
  type AdminBillingSettings,
  type AdminOrganizationSummary,
  type AdminPlanRevenue,
  type AdminRecentPayment,
  type PageResponse,
} from '../features/admin/api'
import {
  clearAdminDraft,
  getPaymentActionsForStatus,
  readAdminDraft,
  shouldPreserveAdminDraft,
  type PaymentAction,
  validatePaymentActionReason,
  writeAdminDraft,
} from '../features/admin/state'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'

const money = (value: number | null | undefined) =>
  typeof value === 'number' ? `${value.toLocaleString('vi-VN')} ₫` : 'Không có dữ liệu'
const moneyShort = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B ₫`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₫`
  return money(value)
}
const formatCount = (value: number) => value.toLocaleString('vi-VN')

/** Stitch payments ledger: 5 rows per page (same as audit log) */
const BILLING_PAYMENT_PAGE_SIZE = 5

const PIPELINE_STAGES = [
  { id: 'NEW', label: 'Lead mới', tone: 'outline' as const },
  { id: 'CONTACTED', label: 'Khảo sát thử nghiệm', tone: 'secondary' as const },
  { id: 'QUALIFIED', label: 'Đàm phán hợp đồng', tone: 'tertiary' as const },
  { id: 'WON', label: 'Đã ký kết', tone: 'primary' as const },
] as const

const PAYMENT_CHIPS = [
  { id: '', label: 'Tất cả', status: '' },
  { id: 'PAID', label: 'Thành công', status: 'PAID' },
  { id: 'PENDING', label: 'Đang xử lý', status: 'PENDING' },
  { id: 'UNDERPAID', label: 'Chờ khớp lệnh', status: 'UNDERPAID' },
  { id: 'FAILED', label: 'Thất bại', status: 'FAILED' },
  { id: 'REFUNDED', label: 'Hoàn tiền', status: 'REFUNDED' },
  { id: 'VOIDED', label: 'Đã hủy', status: 'VOIDED' },
] as const

const PLAN_COLORS = ['#4edea3', '#4cd7f6', '#ffb95f', '#c4a7ff', '#f87171']
const ROUTE = '/admin/billing'
const chartTip = { background: '#1c1b1d', border: '1px solid #3c4a42', borderRadius: 8 }

const LEAD_PACKAGE_OPTIONS = [
  { value: 'EDU_K12', label: 'Giáo dục K12' },
  { value: 'EDU_UNI', label: 'Giáo dục ĐH' },
  { value: 'MUSEUM', label: 'Bảo tàng' },
  { value: 'HERITAGE', label: 'Di sản / địa phương' },
  { value: 'TRAVEL', label: 'Du lịch' },
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'OPEX', label: 'OPEX' },
] as const

const INVOICE_PLAN_OPTIONS = [
  { value: 'MICRO', label: 'Micro' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
] as const

const emptyLeadForm = () => ({
  siteName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  packageType: 'EDU_K12',
  message: '',
  adminNotes: '',
  interestSiteCode: '',
  status: 'NEW',
})

const emptyInvoiceForm = () => ({
  orgName: '',
  contactEmail: '',
  planType: 'STANDARD',
  organizationId: '',
  licenseCount: '1',
})

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-code-sm text-code-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary'
const btnGhost =
  'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-surface-container px-3 font-headline-sm text-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50'
const btnPrimary =
  'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-container px-3 font-headline-sm text-sm font-bold text-on-primary-container shadow-[0_0_16px_rgba(78,222,163,0.3)] hover:opacity-95 disabled:opacity-50'
const btnSecondary =
  'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-secondary px-3 font-headline-sm text-sm font-semibold text-on-secondary hover:opacity-90 disabled:opacity-50'

type ChartPeriod = 'week' | 'month' | 'quarter'
type PipelineView = 'kanban' | 'matrix'
type PaymentFacetCounts = {
  all: number
  PAID: number
  PENDING: number
  UNDERPAID: number
  FAILED: number
  REFUNDED: number
  VOIDED: number
}

function paymentStatusMeta(status: string) {
  const key = status.trim().toUpperCase()
  if (key === 'PAID') {
    return { label: 'Thành công', className: 'bg-primary-container/15 text-primary border-primary/20' }
  }
  if (key === 'PENDING') {
    return { label: 'Đang xử lý', className: 'bg-tertiary/15 text-tertiary border-tertiary/25' }
  }
  if (key === 'UNDERPAID') {
    return { label: 'Chờ khớp lệnh', className: 'bg-tertiary/15 text-tertiary border-tertiary/25' }
  }
  if (key === 'FAILED') {
    return { label: 'Thất bại', className: 'bg-error/15 text-error border-error/25' }
  }
  if (key === 'REFUNDED') {
    return { label: 'Đã hoàn tiền', className: 'bg-secondary/15 text-secondary border-secondary/25' }
  }
  if (key === 'VOIDED') {
    return { label: 'Đã hủy', className: 'bg-surface-container-high text-on-surface-variant border-outline-variant' }
  }
  return { label: status || '—', className: 'bg-surface-container-high text-on-surface-variant border-outline-variant' }
}

function channelLabel(channel?: string | null) {
  const key = (channel ?? '').trim().toUpperCase()
  if (key === 'B2B') return { label: 'B2B hợp đồng', color: 'bg-secondary' }
  if (key === 'B2C') return { label: 'B2C Quest', color: 'bg-primary' }
  return { label: channel?.trim() || 'Không rõ cổng', color: 'bg-outline' }
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return '—'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return new Date(iso).toLocaleString('vi-VN')
}

function nextPipelineStatus(current: string): string | null {
  const idx = PIPELINE_STAGES.findIndex((s) => s.id === current.toUpperCase())
  if (idx < 0 || idx >= PIPELINE_STAGES.length - 1) return null
  return PIPELINE_STAGES[idx + 1].id
}

function downloadPaymentsCsv(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `histar-doi-soat-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function paymentActionMeta(action: PaymentAction) {
  if (action === 'MARK_PAID') return { label: 'Đánh dấu đã thanh toán', title: 'Xác nhận đã thanh toán' }
  if (action === 'REFUND') return { label: 'Hoàn tiền', title: 'Xác nhận hoàn tiền' }
  return { label: 'Hủy giao dịch', title: 'Xác nhận hủy giao dịch' }
}

function sparkPath(values: number[]) {
  if (values.length < 2) return 'M1 10 L55 10'
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)
  return values
    .map((v, i) => {
      const x = 1 + (i / (values.length - 1)) * 54
      const y = 18 - ((v - min) / span) * 16
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function planDisplayName(plan: string) {
  const raw = plan.trim()
  if (!raw) return 'Khác'
  if (/cá nhân|b2c|personal|premium/i.test(raw)) return 'Gói Cá nhân (B2C)'
  if (/trường|edu|school|k12|standard/i.test(raw)) return 'Gói Trường học (Edu)'
  if (/bảo tàng|tổ chức|museum|org|heritage|micro|basic/i.test(raw)) return 'Gói Bảo tàng / Tổ chức'
  return raw
}

function planDescription(planName: string) {
  if (planName.includes('Cá nhân') || planName.includes('B2C')) return 'Quest vé lẻ & Plus'
  if (planName.includes('Trường') || planName.includes('Edu')) return 'Bản quyền ngoại khóa K12'
  if (planName.includes('Bảo tàng') || planName.includes('Tổ chức')) return 'Hợp tác địa phương'
  return 'Phân khúc hợp đồng'
}

export function AdminBillingPage() {
  const [params, setParams] = useSearchParams()
  const paymentPage = Math.max(Number(params.get('paymentPage') ?? '1') - 1, 0)
  const paymentStatus = params.get('paymentStatus') ?? ''
  const channel = params.get('channel') ?? ''
  const inquiryPage = Math.max(Number(params.get('inquiryPage') ?? '1') - 1, 0)
  const inquiryStatus = params.get('inquiryStatus') ?? ''
  const [overview, setOverview] = useState<AdminBillingOverview | null>(null)
  const [payments, setPayments] = useState<PageResponse<AdminRecentPayment> | null>(null)
  const [inquiries, setInquiries] = useState<PageResponse<AdminB2b2cInquiry> | null>(null)
  const [pipelineItems, setPipelineItems] = useState<AdminB2b2cInquiry[]>([])
  const [settings, setSettings] = useState<AdminBillingSettings | null>(null)
  const [price, setPrice] = useState('')
  const [chatLimit, setChatLimit] = useState(10)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  /** First paint only — never toggle this on filter clicks (avoids full-page flash). */
  const [bootLoading, setBootLoading] = useState(true)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [inquiriesLoading, setInquiriesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('month')
  const [pipelineView, setPipelineView] = useState<PipelineView>('kanban')
  const [paymentFacets, setPaymentFacets] = useState<PaymentFacetCounts>({
    all: 0,
    PAID: 0,
    PENDING: 0,
    UNDERPAID: 0,
    FAILED: 0,
    REFUNDED: 0,
    VOIDED: 0,
  })
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [paymentActionOpen, setPaymentActionOpen] = useState<{
    item: AdminRecentPayment
    action: PaymentAction
  } | null>(null)
  const [paymentActionReason, setPaymentActionReason] = useState('')
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null)
  const [paymentActionSaving, setPaymentActionSaving] = useState(false)
  const [exportingPayments, setExportingPayments] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm)
  const [leadForm, setLeadForm] = useState(emptyLeadForm)
  const [orgOptions, setOrgOptions] = useState<AdminOrganizationSummary[]>([])
  const { user } = useAuth()
  const userId = user?.id
  const { showToast } = useToast()
  const motion = useAdminChartAnimation()

  const update = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === 'paymentStatus' || key === 'channel') next.delete('paymentPage')
        if (key === 'inquiryStatus') next.delete('inquiryPage')
        return next
      },
      { replace: true },
    )

  const openInvoiceModal = () => {
    setInvoiceForm(emptyInvoiceForm())
    setInvoiceOpen(true)
    void adminApi
      .listOrganizations({ page: 0, size: 100 })
      .then((page) => setOrgOptions(page.items ?? []))
      .catch(() => setOrgOptions([]))
  }

  const openLeadModal = () => {
    setLeadForm(emptyLeadForm())
    setLeadOpen(true)
  }

  const submitInvoice = async () => {
    const orgName = invoiceForm.orgName.trim()
    const contactEmail = invoiceForm.contactEmail.trim()
    const licenseCount = Math.max(1, Number(invoiceForm.licenseCount) || 1)
    if (!invoiceForm.organizationId && !orgName) {
      showToast({ message: 'Nhập tên tổ chức hoặc chọn tổ chức hiện có.', type: 'error' })
      return
    }
    if (!contactEmail && !invoiceForm.organizationId) {
      showToast({ message: 'Email liên hệ bắt buộc khi chưa gắn tổ chức.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const intent = await adminApi.createB2bInvoice({
        orgName: orgName || null,
        contactEmail: contactEmail || null,
        planType: invoiceForm.planType,
        organizationId: invoiceForm.organizationId || null,
        licenseCount,
      })
      setInvoiceOpen(false)
      showToast({
        message: `Đã tạo hóa đơn ${intent.orderCode} · ${money(intent.amountVnd)} (${intent.status}).`,
        type: 'success',
      })
      void loadPayments()
      void loadPaymentFacets()
      void loadShell()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const submitLead = async () => {
    const siteName = leadForm.siteName.trim()
    const contactName = leadForm.contactName.trim()
    const contactEmail = leadForm.contactEmail.trim()
    if (!siteName || !contactName || !contactEmail) {
      showToast({ message: 'Điền đủ tên đơn vị, người liên hệ và email.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const created = await adminApi.createB2b2cInquiry({
        siteName,
        contactName,
        contactEmail,
        contactPhone: leadForm.contactPhone.trim() || null,
        packageType: leadForm.packageType,
        message: leadForm.message.trim() || null,
        adminNotes: leadForm.adminNotes.trim() || null,
        interestSiteCode: leadForm.interestSiteCode.trim() || null,
        status: leadForm.status || 'NEW',
      })
      setLeadOpen(false)
      showToast({ message: `Đã thêm lead «${created.siteName}» (${created.status}).`, type: 'success' })
      void loadInquiries()
      void loadPipeline()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const loadPaymentFacets = useCallback(async () => {
    const channelFilter = channel || undefined
    try {
      const [all, paid, pending, underpaid, failed, refunded, voided] = await Promise.all([
        adminApi.listPayments({ page: 0, size: 1, channel: channelFilter }),
        adminApi.listPayments({ page: 0, size: 1, status: 'PAID', channel: channelFilter }),
        adminApi.listPayments({ page: 0, size: 1, status: 'PENDING', channel: channelFilter }),
        adminApi.listPayments({ page: 0, size: 1, status: 'UNDERPAID', channel: channelFilter }),
        adminApi.listPayments({ page: 0, size: 1, status: 'FAILED', channel: channelFilter }),
        adminApi.listPayments({ page: 0, size: 1, status: 'REFUNDED', channel: channelFilter }),
        adminApi.listPayments({ page: 0, size: 1, status: 'VOIDED', channel: channelFilter }),
      ])
      setPaymentFacets({
        all: all.totalItems,
        PAID: paid.totalItems,
        PENDING: pending.totalItems,
        UNDERPAID: underpaid.totalItems,
        FAILED: failed.totalItems,
        REFUNDED: refunded.totalItems,
        VOIDED: voided.totalItems,
      })
    } catch {
      /* facet counts are best-effort */
    }
  }, [channel])

  const loadPipeline = useCallback(async () => {
    try {
      const first = await adminApi.listB2b2cInquiries({ page: 0, size: 100 })
      let items = [...first.items]
      if (first.totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: Math.min(first.totalPages - 1, 4) }, (_, i) =>
            adminApi.listB2b2cInquiries({ page: i + 1, size: 100 }),
          ),
        )
        for (const page of rest) items = items.concat(page.items)
      }
      setPipelineItems(items.filter((item) => item.status.toUpperCase() !== 'LOST'))
    } catch {
      setPipelineItems([])
    }
  }, [])

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true)
    setErrors((v) => ({ ...v, payments: null }))
    try {
      const next = await adminApi.listPayments({
        page: paymentPage,
        size: BILLING_PAYMENT_PAGE_SIZE,
        status: paymentStatus || undefined,
        channel: channel || undefined,
      })
      setPayments(next)
    } catch (cause) {
      setPayments(null)
      setErrors((v) => ({ ...v, payments: getFriendlyErrorMessage(cause, 'quest') }))
    } finally {
      setPaymentsLoading(false)
    }
  }, [channel, paymentPage, paymentStatus])

  const loadInquiries = useCallback(async () => {
    setInquiriesLoading(true)
    setErrors((v) => ({ ...v, inquiries: null }))
    try {
      const next = await adminApi.listB2b2cInquiries({
        page: inquiryPage,
        size: 20,
        status: inquiryStatus || undefined,
      })
      setInquiries(next)
    } catch (cause) {
      setInquiries(null)
      setErrors((v) => ({ ...v, inquiries: getFriendlyErrorMessage(cause, 'quest') }))
    } finally {
      setInquiriesLoading(false)
    }
  }, [inquiryPage, inquiryStatus])

  const loadShell = useCallback(async () => {
    setErrors((v) => ({ ...v, overview: null, settings: null }))
    const [overviewResult, settingsResult] = await Promise.allSettled([
      adminApi.billingOverview(12),
      adminApi.getBillingSettings(),
    ])
    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value)
    else {
      setOverview(null)
      setErrors((v) => ({ ...v, overview: getFriendlyErrorMessage(overviewResult.reason, 'quest') }))
    }
    if (settingsResult.status === 'fulfilled') {
      setSettings(settingsResult.value)
      const draft =
        userId && typeof sessionStorage !== 'undefined'
          ? readAdminDraft<{ price: string; chatLimit: string }>(sessionStorage, userId, ROUTE, 'settings')
          : null
      setPrice(draft?.price ?? String(settingsResult.value.b2cPremiumPriceVnd))
      setChatLimit(Number(draft?.chatLimit ?? settingsResult.value.chatFreeDailyLimit))
    } else {
      setSettings(null)
      setErrors((v) => ({ ...v, settings: getFriendlyErrorMessage(settingsResult.reason, 'quest') }))
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBootLoading(true)
      await loadShell()
      if (!cancelled) setBootLoading(false)
    })()
    void loadPipeline()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shell + pipeline boot once
  }, [])

  // Filter/page changes only refresh the matching section (no full-page unmount).
  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  useEffect(() => {
    void loadInquiries()
  }, [loadInquiries])

  useEffect(() => {
    void loadPaymentFacets()
  }, [loadPaymentFacets])

  const saveSettings = async () => {
    if (!settings) return
    const nextChatLimit = Math.min(50, Math.max(3, Number(chatLimit) || 10))
    const nextPrice = Number(price)
    if (!Number.isFinite(nextPrice) || nextPrice < 1000) {
      showToast({ message: 'Giá Premium B2C phải từ 1.000 VND.', type: 'error' })
      return
    }
    setChatLimit(nextChatLimit)
    setSaving(true)
    try {
      const next = await adminApi.updateBillingSettings({
        b2cPremiumPriceVnd: nextPrice,
        chatFreeDailyLimit: nextChatLimit,
      })
      setSettings(next)
      setChatLimit(next.chatFreeDailyLimit)
      setPrice(String(next.b2cPremiumPriceVnd))
      if (userId && typeof sessionStorage !== 'undefined') clearAdminDraft(sessionStorage, userId, ROUTE, 'settings')
      showToast({
        message: `Đã lưu: Premium ${next.b2cPremiumPriceVnd.toLocaleString('vi-VN')}đ · AI Free ${next.chatFreeDailyLimit} câu/ngày.`,
        type: 'success',
      })
    } catch (cause) {
      if (userId && typeof sessionStorage !== 'undefined' && shouldPreserveAdminDraft(cause)) {
        writeAdminDraft(sessionStorage, userId, ROUTE, 'settings', {
          price,
          chatLimit: String(chatLimit),
        })
      }
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveInquiry = async (item: AdminB2b2cInquiry, status: string) => {
    const adminNotes = notes[item.id] ?? item.adminNotes ?? ''
    try {
      await adminApi.updateB2b2cInquiryStatus(item.id, status, adminNotes.trim() || null)
      if (userId && typeof sessionStorage !== 'undefined') {
        clearAdminDraft(sessionStorage, userId, ROUTE, `inquiry:${item.id}`)
      }
      void loadInquiries()
      void loadPipeline()
    } catch (cause) {
      if (userId && typeof sessionStorage !== 'undefined' && shouldPreserveAdminDraft(cause)) {
        writeAdminDraft(sessionStorage, userId, ROUTE, `inquiry:${item.id}`, { status, adminNotes })
      }
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    }
  }

  const exportFilteredPayments = async () => {
    setExportingPayments(true)
    try {
      const blob = await adminApi.exportPaymentsCsv({
        status: paymentStatus || undefined,
        channel: channel || undefined,
      })
      downloadPaymentsCsv(blob)
      showToast({ message: 'Đã xuất CSV theo bộ lọc hiện tại.', type: 'success' })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setExportingPayments(false)
    }
  }

  const openPaymentAction = (item: AdminRecentPayment, action: PaymentAction) => {
    setPaymentActionReason('')
    setPaymentActionError(null)
    setPaymentActionOpen({ item, action })
  }

  const submitPaymentAction = async () => {
    if (!paymentActionOpen) return
    const reasonError = validatePaymentActionReason(paymentActionReason)
    if (reasonError) {
      setPaymentActionError(reasonError)
      return
    }
    setPaymentActionSaving(true)
    try {
      const { item, action } = paymentActionOpen
      if (action === 'MARK_PAID') await adminApi.markPaymentPaid(item.channel ?? '', item.id, paymentActionReason.trim())
      else if (action === 'REFUND') await adminApi.refundPayment(item.channel ?? '', item.id, paymentActionReason.trim())
      else await adminApi.voidPayment(item.channel ?? '', item.id, paymentActionReason.trim())
      setPaymentActionOpen(null)
      showToast({ message: `Đã cập nhật giao dịch ${item.orderCode}.`, type: 'success' })
      await Promise.all([loadPayments(), loadPaymentFacets(), loadShell()])
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setPaymentActionSaving(false)
    }
  }

  const chartMonths = useMemo(() => {
    const rows = overview?.monthlyRevenue ?? []
    if (chartPeriod === 'week') return rows.slice(-3)
    if (chartPeriod === 'month') return rows.slice(-6)
    return rows
  }, [chartPeriod, overview?.monthlyRevenue])

  const channelTotals = useMemo(() => {
    const rows = overview?.monthlyRevenue ?? []
    return {
      b2c: rows.reduce((sum, row) => sum + (row.b2cRevenueVnd || 0), 0),
      b2b: rows.reduce((sum, row) => sum + (row.b2bRevenueVnd || 0), 0),
    }
  }, [overview?.monthlyRevenue])

  const momDelta = useMemo(() => {
    if (!overview) return null
    if (typeof overview.previousMonthRevenueVnd === 'number') {
      return overview.actualRevenueMonthVnd - overview.previousMonthRevenueVnd
    }
    if (overview.monthOverMonthPct == null) return null
    const factor = 1 + overview.monthOverMonthPct / 100
    if (factor === 0) return null
    const previous = overview.actualRevenueMonthVnd / factor
    return Math.round(overview.actualRevenueMonthVnd - previous)
  }, [overview])

  const sparkValues = useMemo(
    () => (overview?.monthlyRevenue ?? []).map((row) => row.b2cRevenueVnd + row.b2bRevenueVnd),
    [overview?.monthlyRevenue],
  )

  const planSlices = useMemo(() => {
    const rows = overview?.planRevenue ?? []
    const total = rows.reduce((sum, row) => sum + (Number(row.revenueVnd) || 0), 0)
    return rows
      .filter((row) => Number(row.revenueVnd) > 0)
      .map((row: AdminPlanRevenue, index) => {
        const name = planDisplayName(row.plan)
        return {
          ...row,
          name,
          description: row.description?.trim() || planDescription(name),
          pct: total > 0 ? Math.round((Number(row.revenueVnd) / total) * 1000) / 10 : 0,
          color: PLAN_COLORS[index % PLAN_COLORS.length],
        }
      })
  }, [overview?.planRevenue])

  const annualDisplay = useMemo(() => {
    const monthly = Number(price)
    if (!Number.isFinite(monthly) || monthly <= 0) return '—'
    return money(Math.round(monthly * 12 * 0.8))
  }, [price])

  const pipelineByStage = useMemo(() => {
    const map: Record<string, AdminB2b2cInquiry[]> = {
      NEW: [],
      CONTACTED: [],
      QUALIFIED: [],
      WON: [],
    }
    for (const item of pipelineItems) {
      const key = item.status.toUpperCase()
      if (map[key]) map[key].push(item)
    }
    return map
  }, [pipelineItems])

  const matrixItems = useMemo(() => {
    if (!inquiryStatus) return pipelineItems
    return pipelineItems.filter((item) => item.status.toUpperCase() === inquiryStatus.toUpperCase())
  }, [inquiryStatus, pipelineItems])

  return (
    <section
      className="flex w-full max-w-[1600px] flex-col gap-6 pb-16"
      aria-busy={bootLoading || paymentsLoading || inquiriesLoading}
    >
      {/* Header ribbon */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:flex-row lg:items-center lg:gap-6 lg:p-6">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-space-sm">
            <span className="rounded bg-primary-container/20 px-2 py-0.5 font-code-sm text-code-sm uppercase tracking-wider text-primary">
              Financial core / Live ledger
            </span>
            {overview?.updatedAt && (
              <span className="font-code-sm text-code-sm text-outline">
                Sync: {new Date(overview.updatedAt).toLocaleString('vi-VN')}
              </span>
            )}
          </div>
          <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-surface">Thanh toán &amp; CRM</h1>
          <p className="max-w-3xl font-body-md text-body-md text-on-surface-variant">
            Quản lý doanh thu đa kênh, đối soát cổng thanh toán, thiết lập biểu phí và theo dõi phễu khách hàng B2B.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-center">
          <button
            type="button"
            className={btnGhost}
            disabled={exportingPayments}
            onClick={() => void exportFilteredPayments()}
          >
            <MaterialIcon name="file_download" className="text-[16px]" />
            {exportingPayments ? 'Đang xuất…' : 'Xuất đối soát CSV'}
          </button>
          <button type="button" className={btnPrimary} onClick={openInvoiceModal}>
            <MaterialIcon name="add_circle" className="text-[18px]" />
            Tạo hóa đơn B2B
          </button>
        </div>
      </div>

      {bootLoading && !overview && <AdminLoading label="Đang tải thanh toán và CRM" />}

      {(overview || !bootLoading) && (
        <>
          {/* Tổng quan doanh thu — KPI */}
          <section aria-labelledby="billing-overview">
            <h2 id="billing-overview" className="sr-only">
              Tổng quan doanh thu
            </h2>
            {errors.overview ? (
              <AdminErrorState message={errors.overview} onRetry={() => void loadShell()} />
            ) : overview ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-xl bg-surface-container-low p-4 shadow-sm transition-all hover:bg-surface-container">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      Doanh thu thực thu
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary">
                      <MaterialIcon name="payments" className="text-[16px]" />
                    </span>
                  </div>
                  <div className="my-3 min-w-0">
                    <div className="truncate font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                      {money(overview.actualRevenueMonthVnd)}
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">Kỳ tháng hiện tại (Net)</div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-0.5 font-code-sm text-code-sm font-semibold text-primary">
                      <MaterialIcon name="trending_up" className="text-[14px]" />
                      {overview.monthOverMonthPct == null
                        ? '—'
                        : `${overview.monthOverMonthPct > 0 ? '+' : ''}${overview.monthOverMonthPct}% MoM`}
                    </span>
                    <svg className="h-5 w-14 text-primary opacity-80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 56 20">
                      <path d={sparkPath(sparkValues)} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </article>

                <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-xl bg-surface-container-low p-4 shadow-sm transition-all hover:bg-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      So với tháng trước
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                      <MaterialIcon name="query_stats" className="text-[16px]" />
                    </span>
                  </div>
                  <div className="my-3">
                    <div className="font-headline-lg text-headline-lg font-bold tracking-tight text-secondary">
                      {momDelta == null ? 'Không có dữ liệu' : `${momDelta >= 0 ? '+' : ''}${money(momDelta)}`}
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">Net growth delta</div>
                  </div>
                  <div className="pt-1 font-code-sm text-code-sm font-medium text-secondary">
                    {overview.monthOverMonthPct == null
                      ? 'Chưa có % MoM'
                      : overview.monthOverMonthPct >= 0
                        ? `Tăng ${overview.monthOverMonthPct}% so với tháng trước`
                        : `Giảm ${Math.abs(overview.monthOverMonthPct)}% so với tháng trước`}
                  </div>
                </article>

                <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-xl bg-surface-container-low p-4 shadow-sm transition-all hover:bg-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      MRR ước tính
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                      <MaterialIcon name="autorenew" className="text-[16px]" />
                    </span>
                  </div>
                  <div className="my-3">
                    <div className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                      {money(overview.estimatedMrrVnd)}
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">Subscription run-rate</div>
                  </div>
                  <div className="flex items-center justify-between pt-1 font-code-sm text-code-sm text-on-surface-variant">
                    <span>ARR ước tính</span>
                    <span className="font-semibold text-on-surface">{moneyShort(overview.estimatedArrVnd)}</span>
                  </div>
                </article>

                <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-xl bg-surface-container-low p-4 shadow-sm transition-all hover:bg-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      ARR ước tính
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-high text-tertiary">
                      <MaterialIcon name="account_balance" className="text-[16px]" />
                    </span>
                  </div>
                  <div className="my-3">
                    <div className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                      {money(overview.estimatedArrVnd)}
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">Dự phóng chu kỳ 12 tháng</div>
                  </div>
                  <div className="pt-1 font-code-sm text-code-sm text-tertiary">
                    Độ phủ MRR:{' '}
                    {overview.revenueCoveragePct == null ? 'Không có dữ liệu' : `${overview.revenueCoveragePct}%`}
                  </div>
                </article>

                <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-xl bg-surface-container-low p-4 shadow-sm transition-all hover:bg-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      Đang trả phí
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-high text-secondary">
                      <MaterialIcon name="hub" className="text-[16px]" />
                    </span>
                  </div>
                  <div className="my-3">
                    <div className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                      {formatCount(overview.activePaidSubscriptions)} TK
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">
                      Độ phủ:{' '}
                      {overview.revenueCoveragePct == null ? '—' : `${overview.revenueCoveragePct}%`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(0, overview.revenueCoveragePct ?? 0))}%` }}
                      />
                    </div>
                    <span className="font-code-sm text-code-sm font-bold text-primary">
                      {overview.revenueCoveragePct == null ? '—' : `${overview.revenueCoveragePct}%`}
                    </span>
                  </div>
                </article>
              </div>
            ) : null}
          </section>

          {/* Charts */}
          {overview && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="flex h-full flex-col gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:p-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                        Telemetry doanh thu
                      </span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">
                        B2C Quest Tickets vs B2B Hợp Đồng Tổ Chức
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">B2C</span>
                      </div>
                      <div className="ml-2 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">B2B</span>
                      </div>
                      <div className="ml-2 flex rounded-lg bg-surface-container p-1 font-code-sm text-code-sm text-on-surface-variant">
                        {(
                          [
                            ['week', 'Tuần'],
                            ['month', 'Tháng'],
                            ['quarter', 'Quý'],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setChartPeriod(id)}
                            className={`cursor-pointer rounded px-2 py-0.5 ${
                              chartPeriod === id
                                ? 'bg-surface-container-highest font-semibold text-on-surface'
                                : 'hover:text-on-surface'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {chartMonths.length > 0 ? (
                    <AdminChart
                      bare
                      title="Doanh thu theo kênh"
                      summary="Doanh thu thực thu B2C và B2B theo tháng."
                      rows={chartMonths as Array<Record<string, unknown>>}
                      columns={[
                        { key: 'month', label: 'Tháng' },
                        { key: 'b2cRevenueVnd', label: 'B2C', format: (v) => money(Number(v)) },
                        { key: 'b2bRevenueVnd', label: 'B2B', format: (v) => money(Number(v)) },
                      ]}
                      height={280}
                    >
                      <AreaChart data={chartMonths}>
                        <defs>
                          <linearGradient id="b2cAreaGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#4edea3" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#4edea3" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="b2bAreaGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#4cd7f6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#4cd7f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2c" />
                        <XAxis dataKey="month" stroke="#86948a" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#86948a" tick={{ fontSize: 11 }} tickFormatter={(v) => moneyShort(Number(v))} />
                        <Tooltip contentStyle={chartTip} formatter={(v) => money(Number(v))} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="b2bRevenueVnd"
                          name="B2B"
                          stroke="#4cd7f6"
                          fill="url(#b2bAreaGrad)"
                          strokeWidth={2.5}
                          {...motion}
                        />
                        <Area
                          type="monotone"
                          dataKey="b2cRevenueVnd"
                          name="B2C"
                          stroke="#4edea3"
                          fill="url(#b2cAreaGrad)"
                          strokeWidth={2.5}
                          {...motion}
                        />
                      </AreaChart>
                    </AdminChart>
                  ) : (
                    <AdminEmptyState title="Chưa có chuỗi doanh thu" detail="API overview chưa trả monthlyRevenue." />
                  )}

                  <div className="grid grid-cols-1 gap-2 border-t border-surface-container-high/40 pt-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-surface-container p-2">
                      <span className="font-code-sm text-code-sm text-outline">B2C doanh thu thực</span>
                      <div className="font-headline-sm text-headline-sm font-semibold text-primary">
                        {money(channelTotals.b2c)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-container p-2">
                      <span className="font-code-sm text-code-sm text-outline">B2B hợp đồng đã đối soát</span>
                      <div className="font-headline-sm text-headline-sm font-semibold text-secondary">
                        {money(channelTotals.b2b)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-container p-2">
                      <span className="font-code-sm text-code-sm text-outline">Tỷ trọng kênh (B2B / tổng)</span>
                      <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        {channelTotals.b2c + channelTotals.b2b > 0
                          ? `${Math.round((channelTotals.b2b / (channelTotals.b2c + channelTotals.b2b)) * 1000) / 10}% B2B`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-full flex-col justify-between gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:col-span-4 lg:p-6">
                <div>
                  <div className="flex items-center justify-between pb-2">
                    <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                      Cấu trúc doanh thu
                    </span>
                    <MaterialIcon name="pie_chart" className="text-[18px] text-outline" />
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Phân bổ doanh thu theo gói</h2>
                  <p className="pt-1 font-body-sm text-body-sm text-outline">
                    Đóng góp giá trị giao dịch theo phân khúc hợp đồng
                  </p>
                </div>

                {planSlices.length > 0 ? (
                  <>
                    <div className="relative my-2 flex items-center justify-center">
                      <div className="h-44 w-44" aria-hidden="true">
                        <PieChart width={176} height={176}>
                          <Pie
                            data={planSlices}
                            dataKey="revenueVnd"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={70}
                            paddingAngle={2}
                            stroke="none"
                          >
                            {planSlices.map((slice) => (
                              <Cell key={slice.plan} fill={slice.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </div>
                      <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
                        <span className="font-headline-lg text-headline-lg font-bold leading-none text-on-surface">
                          100%
                        </span>
                        <span className="font-code-sm text-code-sm uppercase tracking-wider text-outline">
                          Allocation
                        </span>
                      </div>
                    </div>
                    <div className="space-y-space-xs pt-1">
                      {planSlices.map((slice) => (
                        <div
                          key={slice.plan}
                          className="flex items-center justify-between rounded-lg bg-surface-container/60 p-2 transition-all hover:bg-surface-container"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm" style={{ background: slice.color }} />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-headline-sm text-headline-sm text-on-surface">{slice.name}</span>
                              <span className="truncate font-code-sm text-code-sm text-outline">{slice.description}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-headline-sm text-headline-sm font-bold text-primary">{slice.pct}%</span>
                            <div className="font-code-sm text-code-sm text-outline">{moneyShort(slice.revenueVnd)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <AdminEmptyState
                    title="Chưa có phân bổ theo gói"
                    detail="API overview chưa trả planRevenue — chỉ hiển thị khi máy chủ cung cấp."
                  />
                )}
              </div>
            </div>
          )}

          {/* Giao dịch + Cài đặt */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            <section
              className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:col-span-8 lg:p-6"
              aria-labelledby="billing-payments"
            >
              <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                      Khu vực A · Live audit
                    </span>
                  </div>
                  <h2 id="billing-payments" className="font-headline-md text-headline-md text-on-surface">
                    Giao dịch
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Sổ nhật ký giao dịch gần nhất</p>
                </div>
                <button
                  type="button"
                  className={btnGhost}
                  disabled={paymentsLoading}
                  onClick={() => {
                    void loadPayments()
                    void loadPaymentFacets()
                  }}
                >
                  <MaterialIcon name="refresh" className="text-[16px]" />
                  {paymentsLoading ? 'Đang tải…' : 'Làm mới'}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container p-2">
                <div className="flex flex-wrap items-center gap-1">
                  {PAYMENT_CHIPS.map((chip) => {
                    const count =
                      chip.id === ''
                        ? paymentFacets.all
                        : paymentFacets[chip.id as keyof PaymentFacetCounts] ?? 0
                    const active = paymentStatus === chip.status
                    return (
                      <button
                        key={chip.id || 'all'}
                        type="button"
                        onClick={() => update('paymentStatus', chip.status)}
                        className={`cursor-pointer rounded-lg px-3 py-1 font-label-md text-label-md transition-all ${
                          active
                            ? 'bg-primary-container font-semibold text-on-primary-container shadow-sm'
                            : 'bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {chip.label} ({formatCount(count)})
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <MaterialIcon name="filter_alt" className="text-[18px] text-outline" />
                  <select
                    aria-label="Kênh giao dịch"
                    value={channel}
                    onChange={(e) => update('channel', e.target.value)}
                    className="rounded-lg bg-surface-container-low px-2.5 py-1 font-code-sm text-code-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Tất cả cổng thanh toán</option>
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                  </select>
                </div>
              </div>

              {errors.payments ? (
                <AdminErrorState message={errors.payments} onRetry={() => void loadPayments()} />
              ) : paymentsLoading && !payments ? (
                <AdminLoading label="Đang tải giao dịch" />
              ) : payments?.items.length === 0 ? (
                <AdminEmptyState title="Chưa có giao dịch" detail="Không có giao dịch phù hợp." />
              ) : payments ? (
                <>
                  <div
                    className={`w-full overflow-x-auto transition-opacity ${paymentsLoading ? 'opacity-60' : 'opacity-100'}`}
                  >
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-surface-container-lowest font-code-sm text-code-sm uppercase tracking-wider text-outline">
                          <th className="rounded-l-lg px-3 py-2.5">Mã GD</th>
                          <th className="px-3 py-2.5">Người thanh toán</th>
                          <th className="px-3 py-2.5 text-right">Số tiền</th>
                          <th className="px-3 py-2.5">Cổng/Kênh</th>
                          <th className="px-3 py-2.5 text-center">Trạng thái</th>
                          <th className="px-3 py-2.5 text-right">Thời gian</th>
                          <th className="rounded-r-lg px-3 py-2.5 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high/40">
                        {payments.items.map((item, index) => {
                          const status = paymentStatusMeta(item.status)
                          const ch = channelLabel(item.channel)
                          const email = item.payerEmail ?? item.userEmail ?? '—'
                          return (
                            <tr
                              key={item.id ?? item.orderCode ?? index}
                              className="h-12 transition-colors hover:bg-surface-container"
                            >
                              <td className="px-3 py-2 font-code-sm text-code-sm font-semibold text-primary">
                                {item.orderCode}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex min-w-[160px] flex-col">
                                  <span className="truncate font-headline-sm text-headline-sm font-medium text-on-surface">
                                    {email}
                                  </span>
                                  {item.transferContent && (
                                    <span className="truncate font-code-sm text-code-sm text-outline">
                                      {item.transferContent}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-code-sm text-code-sm font-bold text-on-surface">
                                {money(item.amountVnd ?? item.amount)}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${ch.color}`} />
                                  <span className="font-body-sm text-body-sm text-on-surface-variant">{ch.label}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 font-label-sm text-label-sm ${status.className}`}
                                >
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-code-sm text-code-sm text-outline">
                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex min-w-max justify-end gap-1.5">
                                  {getPaymentActionsForStatus(item.status).map((action) => (
                                    <button
                                      key={action}
                                      type="button"
                                      className={btnGhost}
                                      onClick={() => openPaymentAction(item, action)}
                                      aria-label={`${paymentActionMeta(action).label} cho giao dịch ${item.orderCode}`}
                                    >
                                      {paymentActionMeta(action).label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-outline">
                        Hiển thị{' '}
                        {payments.page * payments.size + (payments.items.length ? 1 : 0)} -{' '}
                        {payments.page * payments.size + payments.items.length} trong{' '}
                        {formatCount(payments.totalItems)} giao dịch
                      </span>
                    </div>
                    <AdminPagination
                      variant="stitch"
                      page={payments.page}
                      totalPages={payments.totalPages}
                      totalItems={payments.totalItems}
                      onPageChange={(page) => update('paymentPage', page ? String(page + 1) : '')}
                    />
                  </div>
                </>
              ) : null}
            </section>

            {/* Cài đặt & CRM */}
            <section
              className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:col-span-4 lg:p-6"
              aria-labelledby="billing-settings-crm"
            >
              <div>
                <div className="flex items-center justify-between pb-2">
                  <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                    Khu vực B · Rate limits
                  </span>
                  <MaterialIcon name="tune" className="text-[20px] text-outline" />
                </div>
                <h2 id="billing-settings-crm" className="font-headline-md text-headline-md text-on-surface">
                  Billing settings
                </h2>
                <p className="pt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Điều chỉnh giá Premium B2C và hạn mức thuyết minh AI free.
                </p>
              </div>

              {errors.settings ? (
                <AdminErrorState message={errors.settings} onRetry={() => void loadShell()} />
              ) : settings ? (
                <form
                  className="space-y-space-md"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void saveSettings()
                  }}
                >
                  <div className="space-y-space-sm rounded-xl bg-surface-container p-space-md">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 font-headline-sm text-headline-sm text-on-surface">
                        <MaterialIcon name="workspace_premium" className="text-[18px] text-primary" />
                        Giá gói Premium B2C
                      </label>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-code-sm text-code-sm text-primary">
                        Live
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block font-label-sm text-label-sm text-outline">Cước tháng (Monthly)</span>
                      <div className="relative">
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className={inputClass}
                          min={0}
                          step={1000}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-code-sm text-code-sm text-outline">
                          VND
                        </span>
                      </div>
                      {Number.isFinite(Number(price)) && Number(price) > 0 && (
                        <span className="mt-1 block font-code-sm text-code-sm text-primary">
                          {Number(price).toLocaleString('vi-VN')}đ/tháng
                        </span>
                      )}
                      {settings && (
                        <span className="mt-0.5 block font-code-sm text-code-sm text-outline">
                          Giá hiện tại từ backend: {settings.b2cPremiumPriceVnd.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="mb-1 block font-label-sm text-label-sm text-outline">
                        Cước năm ước tính (−20%)
                      </span>
                      <div className="rounded-lg bg-surface-container-lowest px-3 py-2 font-code-sm text-code-sm text-on-surface-variant">
                        {annualDisplay}
                        <span className="ml-2 text-outline">(chỉ hiển thị, không lưu API)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-space-sm rounded-xl bg-surface-container p-space-md">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 font-headline-sm text-headline-sm text-on-surface">
                        <MaterialIcon name="neurology" className="text-[18px] text-secondary" />
                        Giới hạn thuyết minh AI Free
                      </label>
                      <span className="font-code-sm text-code-sm font-bold text-secondary">{chatLimit} câu / ngày</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-outline">
                      Số lượt truy vấn AI miễn phí mỗi ngày cho tài khoản free (3–50). Bấm Lưu để ghi vào billing
                      settings — chat free đọc hạn mức này ngay sau khi lưu.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="range"
                        min={3}
                        max={50}
                        step={1}
                        value={chatLimit}
                        onChange={(e) => setChatLimit(Number(e.target.value))}
                        aria-label="Giới hạn thuyết minh AI Free mỗi ngày"
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-highest accent-primary"
                      />
                      <div className="flex justify-between font-code-sm text-code-sm text-outline">
                        <span>3 (Thắt chặt)</span>
                        <span>25</span>
                        <span>50 (Rộng rãi)</span>
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={saving} className={`${btnPrimary} h-10 w-full justify-center`}>
                    <MaterialIcon name="check_circle" className="text-[18px]" />
                    {saving ? 'Đang lưu…' : 'Lưu giá mới'}
                  </button>
                </form>
              ) : null}

              <div className="flex items-start gap-2 rounded-lg bg-surface-container/40 p-2.5">
                <MaterialIcon name="verified_user" className="mt-0.5 shrink-0 text-[18px] text-primary" />
                <span className="font-code-sm text-code-sm text-outline">
                  Thay đổi biểu phí được lưu qua admin billing settings; hiệu lực theo cấu hình máy chủ.
                </span>
              </div>
            </section>
          </div>

          {/* Phễu B2B */}
          <section
            className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:p-6"
            aria-labelledby="billing-pipeline"
          >
            <div className="flex flex-col justify-between gap-space-sm pb-2 lg:flex-row lg:items-center">
              <div>
                <span className="rounded bg-secondary/15 px-2 py-0.5 font-code-sm text-code-sm font-semibold uppercase tracking-wider text-secondary">
                  Khu vực C · Pipeline B2B
                </span>
                <h2 id="billing-pipeline" className="pt-1 font-headline-md text-headline-md text-on-surface">
                  Phễu yêu cầu thương mại
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Theo dõi cơ hội từ lead đến ký kết — dữ liệu từ b2b2c-inquiries.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-space-sm">
                <div className="flex rounded-lg bg-surface-container p-1 font-code-sm text-code-sm text-on-surface-variant">
                  <button
                    type="button"
                    onClick={() => setPipelineView('kanban')}
                    className={`flex cursor-pointer items-center gap-1 rounded px-2.5 py-1 ${
                      pipelineView === 'kanban'
                        ? 'bg-surface-container-highest font-semibold text-on-surface'
                        : 'hover:text-on-surface'
                    }`}
                  >
                    <MaterialIcon name="view_kanban" className="text-[14px]" />
                    Kanban board
                  </button>
                  <button
                    type="button"
                    onClick={() => setPipelineView('matrix')}
                    className={`flex cursor-pointer items-center gap-1 rounded px-2.5 py-1 ${
                      pipelineView === 'matrix'
                        ? 'bg-surface-container-highest font-semibold text-on-surface'
                        : 'hover:text-on-surface'
                    }`}
                  >
                    <MaterialIcon name="table_rows" className="text-[14px]" />
                    Bảng ma trận
                  </button>
                </div>
                <button type="button" className={btnSecondary} onClick={openLeadModal}>
                  <MaterialIcon name="person_add" className="text-[16px]" />
                  Thêm Lead B2B mới
                </button>
              </div>
            </div>

            {errors.inquiries ? (
              <AdminErrorState message={errors.inquiries} onRetry={() => void loadInquiries()} />
            ) : pipelineView === 'kanban' ? (
              pipelineItems.length === 0 ? (
                <AdminEmptyState title="Chưa có yêu cầu" detail="Không có yêu cầu phù hợp." />
              ) : (
                <div className="grid grid-cols-1 gap-space-md pt-2 md:grid-cols-2 lg:grid-cols-4">
                  {PIPELINE_STAGES.map((stage) => {
                    const items = pipelineByStage[stage.id] ?? []
                    const dot =
                      stage.tone === 'primary'
                        ? 'bg-primary'
                        : stage.tone === 'secondary'
                          ? 'bg-secondary'
                          : stage.tone === 'tertiary'
                            ? 'bg-tertiary'
                            : 'bg-outline'
                    const countTone =
                      stage.tone === 'primary'
                        ? 'text-primary'
                        : stage.tone === 'secondary'
                          ? 'text-secondary'
                          : stage.tone === 'tertiary'
                            ? 'text-tertiary'
                            : 'text-outline'
                    const border =
                      stage.tone === 'primary'
                        ? 'border-primary'
                        : stage.tone === 'secondary'
                          ? 'border-secondary'
                          : stage.tone === 'tertiary'
                            ? 'border-tertiary'
                            : 'border-transparent'
                    return (
                      <div key={stage.id} className="flex flex-col space-y-space-sm rounded-xl bg-surface-container p-space-sm">
                        <div className="flex items-center justify-between px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                            <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                              {stage.label}
                            </span>
                          </div>
                          <span
                            className={`rounded-full bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm font-bold ${countTone}`}
                          >
                            {items.length} cơ hội
                          </span>
                        </div>
                        {items.length === 0 ? (
                          <p className="px-2 py-4 font-code-sm text-code-sm text-outline">Trống</p>
                        ) : (
                          items.map((item) => {
                            const next = nextPipelineStatus(item.status)
                            return (
                              <article
                                key={item.id}
                                className={`space-y-2 rounded-xl border-l-2 bg-surface-container-low p-space-md shadow-sm transition-all hover:bg-surface-container-high ${border}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="rounded bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm text-on-surface-variant">
                                    {item.packageType || 'B2B'}
                                  </span>
                                  <span className="font-code-sm text-code-sm text-outline">
                                    {relativeTime(item.createdAt)}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                                    {item.siteName}
                                  </h3>
                                  <p className="font-body-sm text-body-sm text-outline">
                                    {item.interestSiteCode || 'Yêu cầu thương mại'}
                                  </p>
                                  {item.organizationId && (
                                    <Link
                                      to={`/admin/organizations?orgId=${encodeURIComponent(item.organizationId)}`}
                                      className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 font-label-sm text-label-sm text-secondary hover:bg-secondary/25"
                                    >
                                      <MaterialIcon name="corporate_fare" className="text-[14px]" />
                                      Tổ chức đã liên kết
                                    </Link>
                                  )}
                                </div>
                                <div className="space-y-1 rounded bg-surface-container-lowest p-2 font-code-sm text-code-sm">
                                  <div className="flex items-center gap-1.5 text-on-surface">
                                    <MaterialIcon name="person" className="text-[14px] text-outline" />
                                    <span>{item.contactName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-outline">
                                    <MaterialIcon name="mail" className="text-[14px] text-outline" />
                                    <span className="truncate">{item.contactEmail}</span>
                                  </div>
                                  {item.contactPhone && (
                                    <div className="flex items-center gap-1.5 text-outline">
                                      <MaterialIcon name="call" className="text-[14px] text-outline" />
                                      <span>{item.contactPhone}</span>
                                    </div>
                                  )}
                                </div>
                                <label className="block font-body-sm text-body-sm text-on-surface-variant">
                                  Ghi chú quản trị
                                  <textarea
                                    value={notes[item.id] ?? item.adminNotes ?? ''}
                                    onChange={(e) =>
                                      setNotes((current) => ({ ...current, [item.id]: e.target.value }))
                                    }
                                    onBlur={() => void saveInquiry(item, item.status)}
                                    rows={2}
                                    className={`mt-1 ${inputClass}`}
                                  />
                                </label>
                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <span className="font-code-sm text-code-sm text-outline">{item.status}</span>
                                  {next ? (
                                    <button
                                      type="button"
                                      onClick={() => void saveInquiry(item, next)}
                                      className="flex cursor-pointer items-center gap-1 rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface hover:text-primary"
                                    >
                                      {next === 'WON' ? 'Chốt deal' : 'Chuyển tiếp'}
                                      <MaterialIcon
                                        name={next === 'WON' ? 'done_all' : 'arrow_forward'}
                                        className="text-[14px]"
                                      />
                                    </button>
                                  ) : (
                                    <MaterialIcon name="verified" className="text-[18px] text-primary" />
                                  )}
                                </div>
                              </article>
                            )
                          })
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="Trạng thái yêu cầu"
                    value={inquiryStatus}
                    onChange={(e) => update('inquiryStatus', e.target.value)}
                    className={inputClass + ' w-auto'}
                  >
                    <option value="">Mọi trạng thái</option>
                    {[...PIPELINE_STAGES.map((s) => s.id), 'LOST'].map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                {matrixItems.length === 0 && (!inquiries || inquiries.items.length === 0) ? (
                  <AdminEmptyState title="Chưa có yêu cầu" detail="Không có yêu cầu phù hợp." />
                ) : (
                  <>
                    <div className="space-y-3">
                      {(inquiryStatus ? matrixItems : inquiries?.items ?? matrixItems).map((item) => (
                        <article key={item.id} className="rounded-xl bg-surface-container p-4">
                          <div className="flex flex-wrap justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-on-surface">{item.siteName}</h4>
                              <p className="text-sm text-on-surface-variant">
                                {item.contactName} · {item.contactEmail}
                              </p>
                              {item.organizationId && (
                                <Link
                                  to={`/admin/organizations?orgId=${encodeURIComponent(item.organizationId)}`}
                                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary hover:bg-secondary/25"
                                >
                                  <MaterialIcon name="corporate_fare" className="text-[14px]" />
                                  Tổ chức đã liên kết
                                </Link>
                              )}
                            </div>
                            <select
                              aria-label={`Trạng thái ${item.siteName}`}
                              defaultValue={item.status}
                              onChange={(e) => void saveInquiry(item, e.target.value)}
                              className={inputClass + ' w-auto'}
                            >
                              {[...PIPELINE_STAGES.map((s) => s.id), 'LOST'].map((x) => (
                                <option key={x} value={x}>
                                  {x}
                                </option>
                              ))}
                            </select>
                          </div>
                          <label className="mt-3 block text-sm text-on-surface">
                            Ghi chú quản trị
                            <textarea
                              value={notes[item.id] ?? item.adminNotes ?? ''}
                              onChange={(e) =>
                                setNotes((current) => ({ ...current, [item.id]: e.target.value }))
                              }
                              onBlur={() => void saveInquiry(item, item.status)}
                              rows={2}
                              className={`mt-1 w-full ${inputClass}`}
                            />
                          </label>
                        </article>
                      ))}
                    </div>
                    {inquiries && !inquiryStatus && (
                      <AdminPagination
                        page={inquiries.page}
                        totalPages={inquiries.totalPages}
                        totalItems={inquiries.totalItems}
                        onPageChange={(page) => update('inquiryPage', page ? String(page + 1) : '')}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </>
      )}

      {paymentActionOpen && (
        <AdminModal
          title={paymentActionMeta(paymentActionOpen.action).title}
          subtitle={`Giao dịch ${paymentActionOpen.item.orderCode}`}
          icon="payments"
          onClose={() => !paymentActionSaving && setPaymentActionOpen(null)}
        >
          <div className="flex flex-col gap-4">
            <p id="payment-action-reason-help" className="font-body-sm text-body-sm text-on-surface-variant">
              Nhập lý do nghiệp vụ để lưu cùng lịch sử kiểm toán. Lý do phải có ít nhất 10 ký tự.
            </p>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Lý do
              <textarea
                autoFocus
                rows={4}
                value={paymentActionReason}
                onChange={(event) => {
                  setPaymentActionReason(event.target.value)
                  setPaymentActionError(null)
                }}
                aria-describedby={`payment-action-reason-help${paymentActionError ? ' payment-action-reason-error' : ''}`}
                aria-invalid={Boolean(paymentActionError)}
                className={inputClass}
              />
            </label>
            {paymentActionError && (
              <p id="payment-action-reason-error" role="alert" className="font-body-sm text-body-sm text-error">
                {paymentActionError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button
                type="button"
                className={btnGhost}
                disabled={paymentActionSaving}
                onClick={() => setPaymentActionOpen(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={paymentActionSaving || Boolean(validatePaymentActionReason(paymentActionReason))}
                onClick={() => void submitPaymentAction()}
              >
                {paymentActionSaving ? 'Đang xử lý…' : paymentActionMeta(paymentActionOpen.action).label}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {invoiceOpen && (
        <AdminModal
          title="Tạo hóa đơn B2B"
          subtitle="Tạo giao dịch SePay PENDING qua API admin"
          icon="receipt_long"
          onClose={() => !saving && setInvoiceOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Tổ chức hiện có (tùy chọn)
              <select
                value={invoiceForm.organizationId}
                onChange={(event) => {
                  const id = event.target.value
                  const org = orgOptions.find((item) => item.id === id)
                  setInvoiceForm((current) => ({
                    ...current,
                    organizationId: id,
                    orgName: org?.name ?? current.orgName,
                  }))
                }}
                className={inputClass}
              >
                <option value="">— Không gắn org —</option>
                {orgOptions.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Tên tổ chức trên hóa đơn
              <input
                value={invoiceForm.orgName}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, orgName: event.target.value }))}
                className={inputClass}
                placeholder="VD: Bảo tàng Lịch sử"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Email liên hệ
              <input
                type="email"
                value={invoiceForm.contactEmail}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, contactEmail: event.target.value }))
                }
                className={inputClass}
                placeholder="billing@org.vn"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Gói B2B
                <select
                  value={invoiceForm.planType}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({ ...current, planType: event.target.value }))
                  }
                  className={inputClass}
                >
                  {INVOICE_PLAN_OPTIONS.map((plan) => (
                    <option key={plan.value} value={plan.value}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Số license
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={invoiceForm.licenseCount}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({ ...current, licenseCount: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button
                type="button"
                className={btnGhost}
                disabled={saving}
                onClick={() => setInvoiceOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={saving}
                onClick={() => void submitInvoice()}
              >
                {saving ? 'Đang tạo…' : 'Tạo hóa đơn'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {leadOpen && (
        <AdminModal
          title="Thêm Lead B2B"
          subtitle="Ghi lead vào pipeline CRM (API thật)"
          icon="person_add"
          onClose={() => !saving && setLeadOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Tên đơn vị / di sản
              <input
                value={leadForm.siteName}
                onChange={(event) => setLeadForm((current) => ({ ...current, siteName: event.target.value }))}
                className={inputClass}
                placeholder="VD: Đại học KHXH&NV"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Người liên hệ
                <input
                  value={leadForm.contactName}
                  onChange={(event) =>
                    setLeadForm((current) => ({ ...current, contactName: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Email
                <input
                  type="email"
                  value={leadForm.contactEmail}
                  onChange={(event) =>
                    setLeadForm((current) => ({ ...current, contactEmail: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Số điện thoại
                <input
                  value={leadForm.contactPhone}
                  onChange={(event) =>
                    setLeadForm((current) => ({ ...current, contactPhone: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Gói quan tâm
                <select
                  value={leadForm.packageType}
                  onChange={(event) =>
                    setLeadForm((current) => ({ ...current, packageType: event.target.value }))
                  }
                  className={inputClass}
                >
                  {LEAD_PACKAGE_OPTIONS.map((pkg) => (
                    <option key={pkg.value} value={pkg.value}>
                      {pkg.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Giai đoạn ban đầu
                <select
                  value={leadForm.status}
                  onChange={(event) => setLeadForm((current) => ({ ...current, status: event.target.value }))}
                  className={inputClass}
                >
                  {PIPELINE_STAGES.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Mã điểm quan tâm
                <input
                  value={leadForm.interestSiteCode}
                  onChange={(event) =>
                    setLeadForm((current) => ({ ...current, interestSiteCode: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="vd: hoa-lo"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Ghi chú nội bộ
              <textarea
                value={leadForm.adminNotes}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, adminNotes: event.target.value }))
                }
                rows={2}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Nội dung yêu cầu
              <textarea
                value={leadForm.message}
                onChange={(event) => setLeadForm((current) => ({ ...current, message: event.target.value }))}
                rows={2}
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setLeadOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={saving}
                onClick={() => void submitLead()}
              >
                {saving ? 'Đang lưu…' : 'Thêm lead'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </section>
  )
}
