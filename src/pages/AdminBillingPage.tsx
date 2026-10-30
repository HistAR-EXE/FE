import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminChart } from '../components/admin/AdminChart'
import { AdminInfoHint } from '../components/admin/AdminInfoHint'
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
import { ReferralLeaderboard } from '../features/admin/ReferralLeaderboard'
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

const PLAN_COLORS = ['#0275fb', '#0f766e', '#c38d00', '#7555a8', '#b42318']
const ROUTE = '/admin/billing'
const chartTip = { background: '#ffffff', color: '#0f1b33', border: '1px solid #c8d8ef', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,27,51,0.12)' }

const LEAD_PACKAGE_OPTIONS = [
  { value: 'EDU_K12', label: 'Giáo dục K12' },
  { value: 'EDU_UNI', label: 'Giáo dục ĐH' },
  { value: 'MUSEUM', label: 'Bảo tàng' },
  { value: 'HERITAGE', label: 'Di sản / địa phương' },
  { value: 'TRAVEL', label: 'Du lịch' },
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'OPEX', label: 'OPEX' },
  { value: 'UNDECIDED', label: 'Cần tư vấn phương án' },
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
  'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/35 bg-white px-3 font-headline-sm text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50'
const btnPrimary =
  'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary bg-primary-container px-3 font-headline-sm text-sm font-bold text-on-primary-container hover:bg-primary-container/90 disabled:opacity-50'
const btnSecondary =
  'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-secondary bg-secondary px-3 font-headline-sm text-sm font-semibold text-on-secondary hover:opacity-90 disabled:opacity-50'

type ChartPeriod = 'one-month' | 'three-months' | 'six-months' | 'year' | 'custom'
type ChartView = 'area' | 'bar' | 'combined'
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
  if (key === 'B2B') return { label: 'Hợp đồng tổ chức', color: 'bg-secondary' }
  if (key === 'B2C') return { label: 'Khách cá nhân', color: 'bg-primary' }
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
  const inquiryQuery = params.get('inquiryQuery') ?? ''
  const pipelineDeepLink = params.get('tab') === 'pipeline'
  const [overview, setOverview] = useState<AdminBillingOverview | null>(null)
  const [payments, setPayments] = useState<PageResponse<AdminRecentPayment> | null>(null)
  const [inquiries, setInquiries] = useState<PageResponse<AdminB2b2cInquiry> | null>(null)
  const [pipelineItems, setPipelineItems] = useState<AdminB2b2cInquiry[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [inquirySearch, setInquirySearch] = useState(inquiryQuery)
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
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('six-months')
  const [chartFrom, setChartFrom] = useState('')
  const [chartTo, setChartTo] = useState('')
  const [customRevenue, setCustomRevenue] = useState<AdminBillingOverview['monthlyRevenue'] | null>(null)
  const [customRevenueLoading, setCustomRevenueLoading] = useState(false)
  const [customRevenueError, setCustomRevenueError] = useState<string | null>(null)
  const [customRevenueRequest, setCustomRevenueRequest] = useState(0)
  const [chartView, setChartView] = useState<ChartView>('area')
  const [expandedLeadIds, setExpandedLeadIds] = useState<string[]>([])
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
        if (key === 'inquiryStatus' || key === 'inquiryQuery') next.delete('inquiryPage')
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
    setPipelineLoading(true)
    setPipelineError(null)
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
    } catch (cause) {
      setPipelineError(getFriendlyErrorMessage(cause, 'quest'))
    } finally {
      setPipelineLoading(false)
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
        q: inquiryQuery || undefined,
      })
      setInquiries(next)
    } catch (cause) {
      setInquiries(null)
      setErrors((v) => ({ ...v, inquiries: getFriendlyErrorMessage(cause, 'quest') }))
    } finally {
      setInquiriesLoading(false)
    }
  }, [inquiryPage, inquiryStatus, inquiryQuery])

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
    if (chartPeriod !== 'custom' || customRevenue) return
    let cancelled = false
    setCustomRevenueLoading(true)
    setCustomRevenueError(null)
    void adminApi.billingOverview(36).then((data) => {
      if (!cancelled) setCustomRevenue(data.monthlyRevenue)
    }).catch((cause: unknown) => {
      if (!cancelled) setCustomRevenueError(getFriendlyErrorMessage(cause, 'quest'))
    }).finally(() => {
      if (!cancelled) setCustomRevenueLoading(false)
    })
    return () => { cancelled = true }
  }, [chartPeriod, customRevenue, customRevenueRequest])

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
  }, [])

  // Filter/page changes only refresh the matching section (no full-page unmount).
  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  useEffect(() => {
    void loadInquiries()
  }, [loadInquiries])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      void loadInquiries()
      void loadPipeline()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [loadInquiries, loadPipeline])

  useEffect(() => {
    if (bootLoading || !pipelineDeepLink) return
    const frame = requestAnimationFrame(() =>
      document.getElementById('billing-pipeline')?.scrollIntoView({ block: 'start' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [bootLoading, pipelineDeepLink])

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

  const saveInquiry = async (item: AdminB2b2cInquiry, status: string): Promise<boolean> => {
    const adminNotes = notes[item.id] ?? item.adminNotes ?? ''
    try {
      await adminApi.updateB2b2cInquiryStatus(item.id, status, adminNotes.trim() || null)
      if (userId && typeof sessionStorage !== 'undefined') {
        clearAdminDraft(sessionStorage, userId, ROUTE, `inquiry:${item.id}`)
      }
      void loadInquiries()
      void loadPipeline()
      return true
    } catch (cause) {
      if (userId && typeof sessionStorage !== 'undefined' && shouldPreserveAdminDraft(cause)) {
        writeAdminDraft(sessionStorage, userId, ROUTE, `inquiry:${item.id}`, { status, adminNotes })
      }
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
      return false
    }
  }

  const flushLeadNotes = async (items: AdminB2b2cInquiry[]) => {
    const unique = [...new Map(items.map((item) => [item.id, item])).values()]
    const dirty = unique.filter((item) => notes[item.id] !== undefined && notes[item.id] !== (item.adminNotes ?? ''))
    if (!dirty.length) return true
    const results = await Promise.all(dirty.map((item) => saveInquiry(item, item.status)))
    return results.every(Boolean)
  }

  const toggleLead = async (item: AdminB2b2cInquiry) => {
    const expanded = expandedLeadIds.includes(item.id)
    if (expanded && !(await flushLeadNotes([item]))) return
    setExpandedLeadIds((current) => expanded ? current.filter((id) => id !== item.id) : [...current, item.id])
  }

  const switchPipelineView = async (view: PipelineView) => {
    if (view === pipelineView) return
    if (!(await flushLeadNotes([...pipelineItems, ...(inquiries?.items ?? [])]))) return
    setPipelineView(view)
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
    const rows = chartPeriod === 'custom' ? customRevenue ?? [] : overview?.monthlyRevenue ?? []
    if (chartPeriod === 'one-month') return rows.slice(-1)
    if (chartPeriod === 'three-months') return rows.slice(-3)
    if (chartPeriod === 'six-months') return rows.slice(-6)
    if (chartPeriod === 'year') return rows.slice(-12)
    if (!chartFrom || !chartTo || chartFrom > chartTo) return []
    return rows.filter((row) => row.month.slice(0, 7) >= chartFrom.slice(0, 7) && row.month.slice(0, 7) <= chartTo.slice(0, 7))
  }, [chartPeriod, chartFrom, chartTo, overview?.monthlyRevenue, customRevenue])

  const channelTotals = useMemo(() => {
    const rows = chartMonths
    return {
      b2c: rows.reduce((sum, row) => sum + (row.b2cRevenueVnd || 0), 0),
      b2b: rows.reduce((sum, row) => sum + (row.b2bRevenueVnd || 0), 0),
    }
  }, [chartMonths])

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

  const matrixItems = inquiries?.items ?? []

  return (
    <section
      className="admin-page admin-billing-page flex w-full max-w-[1600px] flex-col gap-6 pb-16"
      aria-busy={bootLoading || paymentsLoading || inquiriesLoading}
    >
      {/* Header ribbon */}
      <div className="admin-page-header flex flex-col justify-between gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:flex-row lg:items-center lg:gap-6 lg:p-6">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-space-sm">
            <span className="rounded bg-primary-container/20 px-2 py-0.5 font-code-sm text-code-sm uppercase tracking-wider text-primary">
              Thanh toán và doanh thu
            </span>
            {overview?.updatedAt && (
              <span className="font-code-sm text-code-sm text-outline">
                Cập nhật: {new Date(overview.updatedAt).toLocaleString('vi-VN')}
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
            className={btnSecondary}
            onClick={() => document.getElementById('billing-pipeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <MaterialIcon name="contact_mail" className="text-[16px]" />
            Yêu cầu tư vấn di sản
          </button>
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
              <div className="admin-billing-kpis grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-xl bg-surface-container-low p-4 shadow-sm transition-all hover:bg-surface-container">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      Doanh thu thực thu
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-container/15 text-primary">
                      <MaterialIcon name="payments" className="text-[16px]" />
                    </span>
                  </div>
                  <div className="my-3 min-w-0">
                    <div className="admin-billing-kpi-value font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                      {money(overview.actualRevenueMonthVnd)}
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">Thực thu trong tháng hiện tại</div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-0.5 font-code-sm text-code-sm font-semibold text-primary">
                      <MaterialIcon name="trending_up" className="text-[14px]" />
                      {overview.monthOverMonthPct == null
                        ? '—'
                        : `${overview.monthOverMonthPct > 0 ? '+' : ''}${overview.monthOverMonthPct}%`}
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
                    <div className="admin-billing-kpi-value font-headline-lg text-headline-lg font-bold tracking-tight text-secondary">
                      {momDelta == null ? 'Không có dữ liệu' : `${momDelta >= 0 ? '+' : ''}${money(momDelta)}`}
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">Chênh lệch doanh thu thực thu</div>
                  </div>
                  <div className="pt-1 font-code-sm text-code-sm font-medium text-secondary">
                    {overview.monthOverMonthPct == null
                      ? 'Chưa có tỷ lệ so sánh'
                      : overview.monthOverMonthPct >= 0
                        ? `Tăng ${overview.monthOverMonthPct}% so với tháng trước`
                        : `Giảm ${Math.abs(overview.monthOverMonthPct)}% so với tháng trước`}
                  </div>
                </article>

                <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-xl bg-surface-container-low p-4 shadow-sm transition-all hover:bg-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      Doanh thu định kỳ tháng
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                      <MaterialIcon name="autorenew" className="text-[16px]" />
                    </span>
                  </div>
                  <div className="my-3">
                    <div className="admin-billing-kpi-value font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                      {money(overview.estimatedMrrVnd)}
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">Ước tính từ thuê bao đang hoạt động</div>
                  </div>
                  <div className="flex items-center justify-between pt-1 font-code-sm text-code-sm text-on-surface-variant">
                    <span>Ước tính năm</span>
                    <span className="font-semibold text-on-surface">{moneyShort(overview.estimatedArrVnd)}</span>
                  </div>
                </article>

                <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-xl bg-surface-container-low p-4 shadow-sm transition-all hover:bg-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                      Doanh thu định kỳ năm
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-high text-tertiary">
                      <MaterialIcon name="account_balance" className="text-[16px]" />
                    </span>
                  </div>
                  <div className="my-3">
                    <div className="admin-billing-kpi-value font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                      {money(overview.estimatedArrVnd)}
                    </div>
                    <div className="font-code-sm text-code-sm text-outline">Dự phóng chu kỳ 12 tháng</div>
                  </div>
                  <div className="pt-1 font-code-sm text-code-sm text-tertiary">
                    Độ đầy đủ của số liệu:{' '}
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
                    <div className="admin-billing-kpi-value font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                      {formatCount(overview.activePaidSubscriptions)} tài khoản
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
                <div className="admin-billing-chart flex h-full flex-col gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:p-6">
                  <div className="flex flex-col gap-3">
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                        Doanh thu theo nhóm khách hàng
                      </span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">
                        Khách cá nhân và hợp đồng tổ chức
                      </h2>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-space-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Cá nhân</span>
                      </div>
                      <div className="ml-2 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Tổ chức</span>
                      </div>
                      <div className="admin-billing-segment" role="group" aria-label="Kiểu biểu đồ doanh thu">
                        {([['area', 'Miền'], ['bar', 'Cột'], ['combined', 'Kết hợp']] as const).map(([id, label]) => (
                          <button key={id} type="button" aria-pressed={chartView === id} onClick={() => setChartView(id)}>{label}</button>
                        ))}
                      </div>
                      <div className="admin-billing-segment" role="group" aria-label="Khoảng thời gian doanh thu">
                        {(
                          [
                            ['one-month', '1 tháng'],
                            ['three-months', '3 tháng'],
                            ['six-months', '6 tháng'],
                            ['year', '1 năm'],
                            ['custom', 'Khác'],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setChartPeriod(id)}
                            aria-pressed={chartPeriod === id}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {chartPeriod === 'custom' && (
                      <div className="admin-billing-date-range flex flex-wrap items-end gap-3 rounded-xl border border-primary/20 bg-white p-3">
                        <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-sm font-semibold text-on-surface-variant">
                          Từ ngày
                          <input type="date" value={chartFrom} min={customRevenue?.[0]?.month ? `${customRevenue[0].month.slice(0, 7)}-01` : undefined} max={chartTo || undefined} onChange={(event) => setChartFrom(event.target.value)} className={inputClass} />
                        </label>
                        <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-sm font-semibold text-on-surface-variant">
                          Đến ngày
                          <input type="date" value={chartTo} min={chartFrom || (customRevenue?.[0]?.month ? `${customRevenue[0].month.slice(0, 7)}-01` : undefined)} onChange={(event) => setChartTo(event.target.value)} className={inputClass} />
                        </label>
                        <p className="w-full text-xs text-on-surface-variant">Số liệu được tổng hợp theo tháng, tối đa 36 tháng gần nhất; khoảng ngày đã chọn sẽ hiển thị các tháng giao với khoảng đó.</p>
                        {chartFrom && chartTo && chartFrom > chartTo && <p className="w-full text-sm text-error">Ngày kết thúc phải sau ngày bắt đầu.</p>}
                      </div>
                    )}
                  </div>

                  {chartPeriod === 'custom' && customRevenueLoading ? (
                    <AdminLoading />
                  ) : chartPeriod === 'custom' && customRevenueError ? (
                    <AdminErrorState message={customRevenueError} onRetry={() => setCustomRevenueRequest((value) => value + 1)} />
                  ) : chartMonths.length > 0 ? (
                    <AdminChart
                      bare
                      title="Doanh thu theo kênh"
                      summary="Doanh thu thực thu B2C và B2B theo tháng."
                      rows={chartMonths as Array<Record<string, unknown>>}
                      columns={[
                        { key: 'month', label: 'Tháng' },
                        { key: 'b2cRevenueVnd', label: 'Cá nhân', format: (v) => money(Number(v)) },
                        { key: 'b2bRevenueVnd', label: 'Tổ chức', format: (v) => money(Number(v)) },
                      ]}
                      height={280}
                    >
                      {chartView === 'area' ? <AreaChart data={chartMonths}>
                        <defs>
                          <linearGradient id="b2cAreaGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#0275fb" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#0275fb" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="b2bAreaGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dceaff" />
                        <XAxis dataKey="month" stroke="#52627d" tick={{ fontSize: 13 }} />
                        <YAxis stroke="#52627d" tick={{ fontSize: 13 }} tickFormatter={(v) => moneyShort(Number(v))} />
                        <Tooltip contentStyle={chartTip} formatter={(v) => money(Number(v))} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="b2bRevenueVnd"
                          name="Tổ chức"
                          stroke="#0f766e"
                          fill="url(#b2bAreaGrad)"
                          strokeWidth={2.5}
                          {...motion}
                        />
                        <Area
                          type="monotone"
                          dataKey="b2cRevenueVnd"
                          name="Cá nhân"
                          stroke="#0275fb"
                          fill="url(#b2cAreaGrad)"
                          strokeWidth={2.5}
                          {...motion}
                        />
                      </AreaChart> : chartView === 'bar' ? <BarChart data={chartMonths}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dceaff" />
                        <XAxis dataKey="month" stroke="#52627d" tick={{ fontSize: 13 }} />
                        <YAxis stroke="#52627d" tick={{ fontSize: 13 }} tickFormatter={(v) => moneyShort(Number(v))} />
                        <Tooltip contentStyle={chartTip} formatter={(v) => money(Number(v))} />
                        <Legend />
                        <Bar dataKey="b2cRevenueVnd" name="Cá nhân" fill="#0275fb" radius={[4, 4, 0, 0]} {...motion} />
                        <Bar dataKey="b2bRevenueVnd" name="Tổ chức" fill="#0f766e" radius={[4, 4, 0, 0]} {...motion} />
                      </BarChart> : <ComposedChart data={chartMonths}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dceaff" />
                        <XAxis dataKey="month" stroke="#52627d" tick={{ fontSize: 13 }} />
                        <YAxis stroke="#52627d" tick={{ fontSize: 13 }} tickFormatter={(v) => moneyShort(Number(v))} />
                        <Tooltip contentStyle={chartTip} formatter={(v) => money(Number(v))} />
                        <Legend />
                        <Bar dataKey="b2cRevenueVnd" name="Cá nhân" fill="#0275fb" radius={[4, 4, 0, 0]} {...motion} />
                        <Line type="monotone" dataKey="b2bRevenueVnd" name="Tổ chức" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} {...motion} />
                      </ComposedChart>}
                    </AdminChart>
                  ) : (
                    <AdminEmptyState title={chartPeriod === 'custom' && (!chartFrom || !chartTo) ? 'Chọn khoảng ngày' : 'Không có doanh thu trong khoảng đã chọn'} detail={chartPeriod === 'custom' && (!chartFrom || !chartTo) ? 'Chọn ngày bắt đầu và kết thúc để xem biểu đồ.' : 'Thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu doanh thu theo tháng.'} />
                  )}

                  <div className="grid grid-cols-1 gap-2 border-t border-surface-container-high/40 pt-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-surface-container p-2">
                      <span className="font-code-sm text-code-sm text-outline">Doanh thu khách cá nhân</span>
                      <div className="font-headline-sm text-headline-sm font-semibold text-primary">
                        {money(channelTotals.b2c)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-container p-2">
                      <span className="font-code-sm text-code-sm text-outline">Hợp đồng tổ chức đã đối soát</span>
                      <div className="font-headline-sm text-headline-sm font-semibold text-secondary">
                        {money(channelTotals.b2b)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface-container p-2">
                      <span className="font-code-sm text-code-sm text-outline">Tỷ trọng doanh thu tổ chức</span>
                      <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        {channelTotals.b2c + channelTotals.b2b > 0
                          ? `${Math.round((channelTotals.b2b / (channelTotals.b2c + channelTotals.b2b)) * 1000) / 10}% B2B`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-billing-donut flex min-h-full flex-col justify-between gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:col-span-4 lg:p-6">
                <div>
                  <div className="flex items-center justify-between pb-2">
                    <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                      Cấu trúc doanh thu
                    </span>
                    <MaterialIcon name="pie_chart" className="text-[18px] text-outline" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <h2 className="font-headline-md text-headline-md text-on-surface">Phân bổ doanh thu theo gói</h2>
                    <AdminInfoHint label="phân bổ doanh thu">Đóng góp giá trị giao dịch theo từng phân khúc hợp đồng.</AdminInfoHint>
                  </div>
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
                    detail="Máy chủ chưa có số liệu phân bổ doanh thu theo gói."
                  />
                )}
              </div>
            </div>
          )}

          {/* Giao dịch + Cài đặt */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            <section
              className="admin-billing-payments flex flex-col gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:col-span-8 lg:p-6"
              aria-labelledby="billing-payments"
            >
              <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                      Khu vực A · Giao dịch
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <h2 id="billing-payments" className="font-headline-md text-headline-md text-on-surface">Giao dịch</h2>
                    <AdminInfoHint label="giao dịch">Danh sách giao dịch gần nhất; bộ lọc áp dụng cho cả bảng và tệp xuất.</AdminInfoHint>
                  </div>
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
                        aria-pressed={active}
                        className={`admin-billing-filter cursor-pointer rounded-lg px-3 py-1 font-label-md text-label-md transition-all ${
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
                    <table className="admin-billing-ledger w-full min-w-[1050px] table-fixed border-collapse text-left">
                      <colgroup><col className="w-[160px]" /><col className="w-[230px]" /><col className="w-[160px]" /><col className="w-[145px]" /><col className="w-[110px]" /><col className="w-[150px]" /><col className="w-[125px]" /></colgroup>
                      <thead>
                        <tr className="bg-surface-container-lowest font-code-sm text-code-sm uppercase tracking-wider text-outline">
                          <th className="rounded-l-lg px-3 py-2.5">Mã giao dịch</th>
                          <th className="px-3 py-2.5">Người thanh toán</th>
                          <th className="px-3 py-2.5 text-right">Số tiền</th>
                          <th className="px-3 py-2.5">Cổng/Kênh</th>
                          <th className="px-3 py-2.5 text-center">Trạng thái</th>
                          <th className="px-3 py-2.5 text-right">Thời gian</th>
                          <th className="rounded-r-lg px-3 py-2.5 text-center">Thao tác</th>
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
                              <td className="break-all px-3 py-2 font-code-sm text-code-sm font-semibold text-primary">
                                {item.orderCode}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate font-body-sm text-body-sm font-medium text-on-surface" title={email}>
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
                                <div className="admin-table-actions">
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
              className="admin-billing-settings flex flex-col justify-between gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:col-span-4 lg:p-6"
              aria-labelledby="billing-settings-crm"
            >
              <div>
                <div className="flex items-center justify-between pb-2">
                  <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                    Khu vực B · Thiết lập
                  </span>
                  <MaterialIcon name="tune" className="text-[20px] text-outline" />
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <h2 id="billing-settings-crm" className="font-headline-md text-headline-md text-on-surface">Thiết lập thanh toán</h2>
                  <AdminInfoHint label="thiết lập thanh toán">Điều chỉnh giá Premium cá nhân và số câu trả lời AI miễn phí mỗi ngày.</AdminInfoHint>
                </div>
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
                        Đang áp dụng
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block font-label-sm text-label-sm text-outline">Cước tháng</span>
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
                          Giá đang áp dụng: {settings.b2cPremiumPriceVnd.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center font-label-sm text-label-sm text-outline">
                        Cước năm ước tính (−20%)
                        <AdminInfoHint label="giá năm ước tính">Giá năm chỉ là ước tính hiển thị; hệ thống không lưu khoản này.</AdminInfoHint>
                      </div>
                      <div className="rounded-lg bg-surface-container-lowest px-3 py-2 font-code-sm text-code-sm text-on-surface-variant">
                        {annualDisplay}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-space-sm rounded-xl bg-surface-container p-space-md">
                    <div className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-1.5 font-headline-sm text-headline-sm text-on-surface">
                        <MaterialIcon name="neurology" className="text-[18px] text-secondary" />
                        Giới hạn thuyết minh AI Free
                        <AdminInfoHint label="giới hạn AI miễn phí">Chọn từ 3 đến 50 câu mỗi ngày. Sau khi lưu, trò chuyện AI sẽ dùng hạn mức mới.</AdminInfoHint>
                      </div>
                      <span className="font-code-sm text-code-sm font-bold text-secondary">{chatLimit} câu / ngày</span>
                    </div>
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

              <div className="flex items-center text-xs text-on-surface-variant">
                Hiệu lực thiết lập
                <AdminInfoHint label="hiệu lực thiết lập">Thay đổi biểu phí được lưu trên máy chủ và có hiệu lực theo cấu hình hệ thống.</AdminInfoHint>
              </div>
            </section>
          </div>

          {/* Phễu B2B */}
          <section
            className="admin-billing-pipeline flex flex-col gap-4 rounded-xl bg-surface-container-low p-5 shadow-md lg:p-6"
            aria-labelledby="billing-pipeline"
          >
            <div className="flex flex-col justify-between gap-space-sm pb-2 lg:flex-row lg:items-center">
              <div>
                <span className="rounded bg-secondary/15 px-2 py-0.5 font-code-sm text-code-sm font-semibold uppercase tracking-wider text-secondary">
                  Khu vực C · Tư vấn di sản
                </span>
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <h2 id="billing-pipeline" className="font-headline-md text-headline-md text-on-surface">Yêu cầu tư vấn số hóa di sản</h2>
                  <AdminInfoHint label="yêu cầu tư vấn">Yêu cầu mới xuất hiện ở cột đầu tiên. Dùng mã hoặc email để tìm trong Bảng ma trận.</AdminInfoHint>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Theo dõi cơ hội hợp tác B2G từ tiếp nhận yêu cầu đến ký kết.</p>
              </div>
              <div className="flex flex-wrap items-center gap-space-sm">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => { void loadInquiries(); void loadPipeline() }}
                >
                  <MaterialIcon name="refresh" className="text-[16px]" />
                  Làm mới
                </button>
                <div className="admin-billing-segment" role="group" aria-label="Cách xem yêu cầu tư vấn">
                  <button
                    type="button"
                    data-lead-control
                    onClick={() => void switchPipelineView('kanban')}
                    aria-pressed={pipelineView === 'kanban'}
                    className="inline-flex items-center gap-1"
                  >
                    <MaterialIcon name="view_kanban" className="text-[14px]" />
                    Bảng giai đoạn
                  </button>
                  <button
                    type="button"
                    data-lead-control
                    onClick={() => void switchPipelineView('matrix')}
                    aria-pressed={pipelineView === 'matrix'}
                    className="inline-flex items-center gap-1"
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

            {pipelineView === 'kanban' && pipelineError ? (
              <AdminErrorState message={pipelineError} onRetry={() => void loadPipeline()} />
            ) : pipelineView === 'matrix' && errors.inquiries ? (
              <AdminErrorState message={errors.inquiries} onRetry={() => void loadInquiries()} />
            ) : pipelineView === 'kanban' ? (
              pipelineLoading && pipelineItems.length === 0 ? (
                <AdminLoading label="Đang tải yêu cầu tư vấn" />
              ) : pipelineItems.length === 0 ? (
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
                      <div key={stage.id} data-stage={stage.id} className="admin-billing-stage flex flex-col space-y-space-sm rounded-xl bg-surface-container p-space-sm">
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
                                className={`admin-billing-lead space-y-2 rounded-xl border-l-2 bg-surface-container-low p-space-md shadow-sm transition-all hover:bg-surface-container-high ${border}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="rounded bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm text-on-surface-variant">
                                    {LEAD_PACKAGE_OPTIONS.find((option) => option.value === item.packageType)?.label || item.packageType || 'B2B'}
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
                                    {item.organizationName || item.interestSiteCode || 'Yêu cầu thương mại'}
                                  </p>
                                  <p className="font-body-sm text-body-sm font-semibold text-primary">{item.contactName}</p>
                                </div>
                                <button type="button" data-lead-control className="admin-billing-expand" aria-expanded={expandedLeadIds.includes(item.id)} onClick={() => void toggleLead(item)}>
                                  {expandedLeadIds.includes(item.id) ? 'Thu gọn' : 'Xem thêm'}
                                  <MaterialIcon name={expandedLeadIds.includes(item.id) ? 'expand_less' : 'expand_more'} className="text-[18px]" />
                                </button>
                                {expandedLeadIds.includes(item.id) && <div className="admin-billing-lead-detail">
                                  <p className="break-all font-code-sm text-code-sm text-outline"><strong>Mã yêu cầu:</strong> {item.id}</p>
                                  {item.organizationId && (
                                    <Link
                                      to={`/admin/organizations?orgId=${encodeURIComponent(item.organizationId)}`}
                                      className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 font-label-sm text-label-sm text-secondary hover:bg-secondary/25"
                                    >
                                      <MaterialIcon name="corporate_fare" className="text-[14px]" />
                                      Tổ chức đã liên kết
                                    </Link>
                                  )}
                                <div className="space-y-1 rounded bg-surface-container-lowest p-2 font-code-sm text-code-sm">
                                  <div className="flex items-center gap-1.5 text-on-surface">
                                    <MaterialIcon name="person" className="text-[14px] text-outline" />
                                    <span>{item.contactName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-outline">
                                    <MaterialIcon name="mail" className="text-[14px] text-outline" />
                                    <span className="break-all">{item.contactEmail}</span>
                                  </div>
                                  {item.contactPhone && (
                                    <div className="flex items-center gap-1.5 text-outline">
                                      <MaterialIcon name="call" className="text-[14px] text-outline" />
                                      <span>{item.contactPhone}</span>
                                    </div>
                                  )}
                                  {item.contactRole && <p className="text-outline"><strong>Chức vụ:</strong> {item.contactRole}</p>}
                                </div>
                                <div className="space-y-1 text-xs text-on-surface-variant">
                                  {item.siteLocation && <p><strong>Địa điểm:</strong> {item.siteLocation}</p>}
                                  {item.targetStart && <p><strong>Dự kiến:</strong> {item.targetStart}</p>}
                                  {item.availableMaterials && <p className="whitespace-pre-wrap"><strong>Tư liệu:</strong> {item.availableMaterials}</p>}
                                  {item.message && <p className="whitespace-pre-wrap"><strong>Mục tiêu:</strong> {item.message}</p>}
                                </div>
                                <label className="block font-body-sm text-body-sm text-on-surface-variant">
                                  Ghi chú quản trị
                                  <textarea
                                    value={notes[item.id] ?? item.adminNotes ?? ''}
                                    onChange={(e) =>
                                      setNotes((current) => ({ ...current, [item.id]: e.target.value }))
                                    }
                                    onBlur={(event) => {
                                      if ((event.relatedTarget as HTMLElement | null)?.closest('[data-lead-control]')) return
                                      if (notes[item.id] !== undefined && notes[item.id] !== (item.adminNotes ?? '')) void saveInquiry(item, item.status)
                                    }}
                                    rows={2}
                                    className={`mt-1 ${inputClass}`}
                                  />
                                </label>
                                </div>}
                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <span className="admin-billing-lead-status font-code-sm text-code-sm">{stage.label}</span>
                                  {next ? (
                                    <button
                                      type="button"
                                      data-lead-control
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
                  <form
                    onSubmit={(event) => { event.preventDefault(); update('inquiryQuery', inquirySearch.trim()) }}
                    className="flex min-w-0 flex-wrap gap-2"
                  >
                    <input
                      aria-label="Tìm yêu cầu tư vấn"
                      value={inquirySearch}
                      onChange={(event) => setInquirySearch(event.target.value)}
                      placeholder="Mã yêu cầu, email hoặc tên đơn vị"
                      className={inputClass + ' min-w-0 sm:w-72'}
                    />
                    <button type="submit" className={btnSecondary}>Tìm</button>
                  </form>
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
                {inquiriesLoading ? (
                  <AdminLoading label="Đang tìm yêu cầu tư vấn" />
                ) : matrixItems.length === 0 ? (
                  <AdminEmptyState title="Chưa có yêu cầu" detail="Không có yêu cầu phù hợp." />
                ) : (
                  <>
                    <div className="space-y-3">
                      {matrixItems.map((item) => (
                        <article key={item.id} data-stage={item.status} className="admin-billing-matrix-lead rounded-xl bg-surface-container p-4">
                          <div className="flex flex-wrap justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-on-surface">{item.siteName}</h4>
                              <p className="text-sm text-on-surface-variant">{LEAD_PACKAGE_OPTIONS.find((option) => option.value === item.packageType)?.label || item.packageType || 'Tư vấn'} · {relativeTime(item.createdAt)}</p>
                              <p className="text-sm font-semibold text-primary">{item.contactName}</p>
                              <button type="button" data-lead-control className="admin-billing-expand" aria-expanded={expandedLeadIds.includes(item.id)} onClick={() => void toggleLead(item)}>
                                {expandedLeadIds.includes(item.id) ? 'Thu gọn' : 'Xem thêm'}
                                <MaterialIcon name={expandedLeadIds.includes(item.id) ? 'expand_less' : 'expand_more'} className="text-[18px]" />
                              </button>
                              {expandedLeadIds.includes(item.id) && <div className="admin-billing-lead-detail">
                              <p className="break-all text-xs text-outline"><strong>Mã yêu cầu:</strong> {item.id}</p>
                              <p><strong>Email:</strong> {item.contactEmail}</p>
                              {item.organizationName && <p><strong>Đơn vị:</strong> {item.organizationName}</p>}
                              {item.contactRole && <p><strong>Chức vụ:</strong> {item.contactRole}</p>}
                              {item.contactPhone && <p><strong>Điện thoại:</strong> {item.contactPhone}</p>}
                              {item.siteLocation && <p><strong>Địa điểm:</strong> {item.siteLocation}</p>}
                              {item.targetStart && <p><strong>Dự kiến:</strong> {item.targetStart}</p>}
                              {item.availableMaterials && <p className="whitespace-pre-wrap"><strong>Tư liệu:</strong> {item.availableMaterials}</p>}
                              {item.message && <p className="whitespace-pre-wrap"><strong>Mục tiêu:</strong> {item.message}</p>}
                              {item.organizationId && (
                                <Link
                                  to={`/admin/organizations?orgId=${encodeURIComponent(item.organizationId)}`}
                                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary hover:bg-secondary/25"
                                >
                                  <MaterialIcon name="corporate_fare" className="text-[14px]" />
                                  Tổ chức đã liên kết
                                </Link>
                              )}
                              </div>}
                            </div>
                            <select
                              aria-label={`Trạng thái ${item.siteName}`}
                              data-lead-control
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
                          {expandedLeadIds.includes(item.id) && <label className="mt-3 block text-sm text-on-surface">
                            Ghi chú quản trị
                            <textarea
                              value={notes[item.id] ?? item.adminNotes ?? ''}
                              onChange={(e) =>
                                setNotes((current) => ({ ...current, [item.id]: e.target.value }))
                              }
                              onBlur={(event) => {
                                if ((event.relatedTarget as HTMLElement | null)?.closest('[data-lead-control]')) return
                                if (notes[item.id] !== undefined && notes[item.id] !== (item.adminNotes ?? '')) void saveInquiry(item, item.status)
                              }}
                              rows={2}
                              className={`mt-1 w-full ${inputClass}`}
                            />
                          </label>}
                        </article>
                      ))}
                    </div>
                    {inquiries && (
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

          {/* Referral Leaderboard */}
          <ReferralLeaderboard />
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
          subtitle="Lưu yêu cầu tư vấn vào danh sách khách hàng cần liên hệ"
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
