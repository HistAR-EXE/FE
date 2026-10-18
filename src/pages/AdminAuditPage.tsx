import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPagination } from '../components/admin/AdminPagination'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { adminApi, type AdminAuditEvent, type PageResponse } from '../features/admin/api'
import { createLatestRequestGuard, parseAdminListState } from '../features/admin/state'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

const inputClass =
  'w-full rounded-lg border-0 bg-surface-container px-3 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary'
const selectClass =
  'w-full appearance-none rounded-lg border-0 bg-surface-container px-3 py-1.5 pr-8 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer'
const btnGhost =
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-surface-container-high px-2.5 text-xs font-semibold text-on-surface hover:bg-surface-variant disabled:opacity-50'
const btnPrimary =
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-container px-2.5 text-xs font-bold text-on-primary-container shadow-[0_0_12px_rgba(78,222,163,0.25)] hover:opacity-95 disabled:opacity-50'

const ENTITY_OPTIONS = [
  { value: '', label: 'Tất cả loại đối tượng' },
  { value: 'DISCOVERY_POINT', label: 'Điểm khám phá' },
  { value: 'ARTIFACT', label: 'Hiện vật' },
  { value: 'QUEST', label: 'Nhiệm vụ' },
  { value: 'NARRATIVE_INVESTIGATION', label: 'Cốt truyện / Pilot' },
  { value: 'ORGANIZATION', label: 'Tổ chức' },
  { value: 'USER', label: 'Người dùng & IAM' },
  { value: 'CONTENT_REPORT', label: 'Báo cáo nội dung' },
  { value: 'BILLING_SETTINGS', label: 'Cấu hình thanh toán' },
  { value: 'B2B2C_INQUIRY', label: 'Lead B2B' },
] as const

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'CREATED', label: 'CREATED' },
  { value: 'UPDATED', label: 'UPDATED' },
  { value: 'SOFT_DELETED', label: 'SOFT_DELETED' },
  { value: 'RESTORED', label: 'RESTORED' },
  { value: 'REVIEWED', label: 'REVIEWED' },
  { value: 'STATUS_UPDATED', label: 'STATUS_UPDATED' },
  { value: 'SETTINGS_UPDATED', label: 'SETTINGS_UPDATED' },
  { value: 'ORG_INVITE_GENERATED', label: 'ORG_INVITE_GENERATED' },
] as const

/** Stitch audit table: 5 rows per page */
const AUDIT_PAGE_SIZE = 5

function formatOccurredAt(value: string) {
  try {
    return new Date(value).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return value
  }
}

function initials(name: string | null | undefined, fallback: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
}

function actionTone(action: string) {
  const key = action.toUpperCase()
  if (key.includes('DELETE') || key.includes('REMOVE')) {
    return 'bg-error-container/20 text-error border-error-container/30'
  }
  if (key.includes('ROLE') || key.includes('ESCALATE') || key.includes('STATUS')) {
    return 'bg-tertiary-container/20 text-tertiary border-tertiary-container/30'
  }
  if (key.includes('PUBLISH') || key.includes('RESTORE') || key.includes('CREATE')) {
    return 'bg-primary-container/20 text-primary border-primary-container/30'
  }
  return 'bg-secondary-container/20 text-secondary border-secondary-container/30'
}

function metaString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function eventIp(event: AdminAuditEvent) {
  return metaString(event.metadata, 'clientIp') ?? metaString(event.metadata, 'ip')
}

function eventLocation(event: AdminAuditEvent) {
  return metaString(event.metadata, 'location') ?? metaString(event.metadata, 'city')
}

function snapshotFromEvent(event: AdminAuditEvent, side: 'before' | 'after') {
  if (side === 'before' && event.before) return event.before
  if (side === 'after' && event.after) return event.after
  const meta = event.metadata
  if (!meta) return null
  const nested = meta[side]
  if (nested && typeof nested === 'object') return nested as Record<string, unknown>
  const oldRole = metaString(meta, 'oldRole')
  const newRole = metaString(meta, 'newRole')
  if (oldRole || newRole) {
    return side === 'before'
      ? { role: oldRole, ...(meta.name ? { name: meta.name } : {}) }
      : { role: newRole, ...(meta.name ? { name: meta.name } : {}) }
  }
  const oldStatus = metaString(meta, 'oldStatus')
  const newStatus = metaString(meta, 'newStatus')
  if (oldStatus || newStatus) {
    return side === 'before' ? { status: oldStatus } : { status: newStatus }
  }
  return null
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function shortHash(hash?: string | null) {
  if (!hash) return '—'
  return hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash
}

export function AdminAuditPage() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const state = parseAdminListState(searchParams)
  const action = searchParams.get('action')?.trim() ?? ''
  const actor = searchParams.get('actor')?.trim() ?? ''
  const actorId = searchParams.get('actorId')?.trim() ?? ''
  const entityIdParam = searchParams.get('entityId')?.trim() ?? ''
  const entityType = searchParams.get('entityType')?.trim() ?? state.type
  const from = searchParams.get('from')?.trim() ?? ''
  const to = searchParams.get('to')?.trim() ?? ''
  const [result, setResult] = useState<PageResponse<AdminAuditEvent> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(state.q)
  const [actorSearch, setActorSearch] = useState(actor)
  const [selected, setSelected] = useState<AdminAuditEvent | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [verifiedBanner, setVerifiedBanner] = useState(false)
  const [integritySummary, setIntegritySummary] = useState<string | null>(null)
  const [integrityValid, setIntegrityValid] = useState<boolean | null>(null)
  const requestGuard = useRef(createLatestRequestGuard())

  const auditFilterQuery = useCallback(
    () => ({
      page: state.page,
      size: AUDIT_PAGE_SIZE,
      q: state.q || undefined,
      sort: state.sort || undefined,
      entityType: entityType || undefined,
      entityId: entityIdParam || undefined,
      actor: actor || undefined,
      actorId: actorId || undefined,
      action: action || undefined,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    }),
    [action, actor, actorId, entityIdParam, entityType, from, state.page, state.q, state.sort, to],
  )

  const load = useCallback(() => {
    const request = requestGuard.current.begin()
    setLoading(true)
    setError(null)
    adminApi
      .listAudit(auditFilterQuery())
      .then((next) => {
        if (request.isLatest()) setResult(next)
      })
      .catch((cause) => {
        if (!request.isLatest()) return
        setResult(null)
        setError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => {
        if (request.isLatest()) setLoading(false)
      })
  }, [auditFilterQuery])

  useEffect(() => {
    load()
    return () => requestGuard.current.invalidate()
  }, [load])
  useEffect(() => setSearch(state.q), [state.q])
  useEffect(() => setActorSearch(actor), [actor])
  useEffect(() => {
    if (searchParams.get('size') === String(AUDIT_PAGE_SIZE)) return
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('size', String(AUDIT_PAGE_SIZE))
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  const updateParam = (key: string, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const applySearch = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      const entityToken = search.trim()
      const nextActor = actorSearch.trim()
      const uuidLike =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entityToken)
      if (uuidLike) {
        next.set('entityId', entityToken)
        next.delete('q')
      } else if (entityToken) {
        next.set('q', entityToken)
        next.delete('entityId')
      } else {
        next.delete('q')
        next.delete('entityId')
      }
      if (nextActor) next.set('actor', nextActor)
      else next.delete('actor')
      next.delete('page')
      return next
    })
  }

  const resetFilters = () => {
    setSearch('')
    setActorSearch('')
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      ;['q', 'actor', 'actorId', 'entityId', 'entityType', 'action', 'from', 'to', 'sort', 'page', 'type'].forEach(
        (key) => next.delete(key),
      )
      return next
    })
  }

  const kpis = useMemo(() => {
    const items = result?.items ?? []
    const totalItems = result?.totalItems ?? 0
    const sensitive = items.filter((item) => {
      const key = item.action.toUpperCase()
      return key.includes('DELETE') || key.includes('ROLE') || key.includes('STATUS') || key.includes('ESCALATE')
    }).length
    const withIp = items.filter((item) => Boolean(eventIp(item))).length
    return { totalItems, sensitive, withIp, pageCount: items.length }
  }, [result])

  const rangeLabel = useMemo(() => {
    if (from && to) return `${from} → ${to}`
    if (from) return `Từ ${from}`
    if (to) return `Đến ${to}`
    return 'Mọi thời điểm'
  }, [from, to])

  const runIntegrityCheck = async () => {
    setVerifying(true)
    try {
      const report = await adminApi.verifyAuditIntegrity(auditFilterQuery())
      setIntegrityValid(report.valid)
      setVerifiedBanner(true)
      if (report.valid) {
        const tip = report.chainTip ? shortHash(report.chainTip) : '—'
        setIntegritySummary(
          `Chuỗi SHA-256 hợp lệ · ${report.checkedCount.toLocaleString('vi-VN')} bản ghi · tip ${tip}`,
        )
        showToast({
          message: `Integrity OK: ${report.checkedCount.toLocaleString('vi-VN')} bản ghi.`,
          type: 'success',
        })
      } else {
        setIntegritySummary(
          `Phát hiện can thiệp · broken ${report.brokenEventId ?? '—'} · đã kiểm ${report.checkedCount}`,
        )
        showToast({
          message: `Integrity lỗi tại sự kiện ${report.brokenEventId ?? 'không xác định'}.`,
          type: 'error',
        })
      }
      load()
    } catch (cause) {
      setIntegrityValid(false)
      setVerifiedBanner(true)
      setIntegritySummary(getFriendlyErrorMessage(cause, 'quest'))
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setVerifying(false)
    }
  }

  const exportAudit = async () => {
    setExporting(true)
    try {
      const blob = await adminApi.exportAuditJson(auditFilterQuery())
      downloadBlob(blob, `histar-audit-${new Date().toISOString().slice(0, 10)}.json`)
      showToast({ message: 'Đã xuất JSON theo bộ lọc hiện tại từ máy chủ.', type: 'success' })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const pageFrom = result ? result.page * result.size + (result.items.length ? 1 : 0) : 0
  const pageTo = result ? result.page * result.size + result.items.length : 0

  return (
    <section className="flex w-full max-w-7xl flex-col pb-16" aria-busy={loading}>
      {verifiedBanner && (
        <div
          className={`relative mb-space-md overflow-hidden rounded-xl px-space-md py-2 shadow-lg ${
            integrityValid === false
              ? 'bg-error-container text-on-error-container'
              : 'bg-primary-container text-on-primary-container'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MaterialIcon
                name={integrityValid === false ? 'gpp_bad' : 'verified_user'}
                className="animate-pulse text-[18px]"
              />
              <div>
                <p className="text-xs font-bold">
                  {integrityValid === false ? 'Integrity thất bại' : 'Integrity SHA-256'}
                </p>
                <p className="text-[11px] opacity-90">{integritySummary ?? 'Đã kiểm tra chuỗi hash trên máy chủ.'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVerifiedBanner(false)}
              className="rounded-lg p-1 hover:bg-black/20"
              aria-label="Đóng thông báo"
            >
              <MaterialIcon name="close" className="text-[16px]" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-space-sm py-space-sm">
        <div className="flex flex-col justify-between gap-space-sm xl:flex-row xl:items-end">
          <div className="max-w-4xl space-y-1">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-outline">
              <span>ADMIN CORE</span>
              <MaterialIcon name="chevron_right" className="text-[12px]" />
              <span>GIÁM SÁT</span>
              <MaterialIcon name="chevron_right" className="text-[12px]" />
              <span className="font-semibold text-primary">NHẬT KÝ KIỂM TOÁN</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-on-surface md:text-2xl">
                Nhật ký kiểm toán &amp; Giám sát tuân thủ
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
                SOC2 / ISO 27001
              </span>
            </div>
            <p className="max-w-3xl text-xs leading-relaxed text-on-surface-variant">
              Tra cứu thay đổi quản trị theo đối tượng, người thực hiện và hành động. Dữ liệu lấy trực tiếp từ API
              audit — không dùng mock Stitch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={btnGhost}
              disabled={verifying || loading}
              onClick={() => void runIntegrityCheck()}
            >
              <MaterialIcon
                name="shield_lock"
                className={`text-[16px] text-primary ${verifying ? 'animate-spin' : ''}`}
              />
              {verifying ? 'Đang xác thực...' : 'Kiểm tra chữ ký Hash (SHA-256)'}
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={exporting || loading}
              onClick={() => void exportAudit()}
            >
              <MaterialIcon name="download_for_offline" className="text-[16px]" />
              {exporting ? 'Đang xuất…' : 'Xuất dữ liệu (JSON)'}
            </button>
          </div>
        </div>

        {(actorId || entityIdParam) && (
          <div className="flex flex-wrap items-center gap-2">
            {entityIdParam && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 font-code-sm text-[11px] text-primary"
                onClick={() => updateParam('entityId', '')}
              >
                entityId: {shortHash(entityIdParam)}
                <MaterialIcon name="close" className="text-[14px]" />
              </button>
            )}
            {actorId && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 font-code-sm text-[11px] text-primary"
                onClick={() => updateParam('actorId', '')}
              >
                actorId: {shortHash(actorId)}
                <MaterialIcon name="close" className="text-[14px]" />
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Tổng ghi nhận (bộ lọc)</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-container text-primary">
                <MaterialIcon name="history" className="text-[14px]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-on-surface">{kpis.totalItems.toLocaleString('vi-VN')}</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-outline">
              Trang hiện tại: {kpis.pageCount} bản ghi · {rangeLabel}
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Hành động nhạy cảm (trang)</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-container text-tertiary">
                <MaterialIcon name="admin_panel_settings" className="text-[14px]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-tertiary">{kpis.sensitive}</span>
              <span className="text-[11px] text-on-surface-variant">lần ghi nhận</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-outline">DELETE / ROLE / STATUS trên trang đang xem</div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Có địa chỉ IP (trang)</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-container text-primary">
                <MaterialIcon name="public" className="text-[14px]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-primary">{kpis.withIp}</span>
              <span className="text-[11px] text-primary">bản ghi</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-outline">clientIp trong metadata audit</div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Chứng thực tuân thủ</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-container text-secondary">
                <MaterialIcon name="verified" className="text-[14px]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-on-surface">ISO/SOC2</span>
              <span className="text-[11px] text-secondary">Active</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-outline">Khung tuân thủ vận hành HistAR Admin</div>
          </div>
        </div>
      </div>

      <form
        className="mb-space-sm rounded-xl bg-surface-container-low p-3 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          applySearch()
        }}
      >
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-3">
            <MaterialIcon
              name="tag"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-outline"
            />
            <input
              aria-label="Tìm theo entity ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm Entity ID..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="relative lg:col-span-2">
            <select
              aria-label="Loại đối tượng"
              value={entityType}
              onChange={(event) => updateParam('entityType', event.target.value)}
              className={selectClass}
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value || 'all-types'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <MaterialIcon
              name="expand_more"
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-outline"
            />
          </div>
          <div className="relative lg:col-span-2">
            <input
              aria-label="Tìm người thực hiện theo tên hoặc email"
              value={actorSearch}
              onChange={(event) => setActorSearch(event.target.value)}
              placeholder="Tên hoặc email người thực hiện"
              className={inputClass}
            />
          </div>
          <div className="relative lg:col-span-2">
            <select
              aria-label="Hành động audit"
              value={action}
              onChange={(event) => updateParam('action', event.target.value)}
              className={selectClass}
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value || 'all-actions'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <MaterialIcon
              name="expand_more"
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-outline"
            />
          </div>
          <div className="flex gap-2 lg:col-span-2">
            <label className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-outline">
              Từ ngày
              <input
                type="date"
                value={from}
                onChange={(event) => updateParam('from', event.target.value)}
                className={`mt-0.5 ${inputClass}`}
              />
            </label>
            <label className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-outline">
              Đến ngày
              <input
                type="date"
                value={to}
                onChange={(event) => updateParam('to', event.target.value)}
                className={`mt-0.5 ${inputClass}`}
              />
            </label>
          </div>
          <div className="flex items-center gap-1.5 lg:col-span-1 lg:justify-end">
            <button type="submit" className={btnPrimary}>
              Tìm
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
              title="Đặt lại bộ lọc"
              aria-label="Đặt lại bộ lọc"
            >
              <MaterialIcon name="restart_alt" className="text-[16px]" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            aria-label="Sắp xếp audit"
            value={state.sort || 'occurredAt,desc'}
            onChange={(event) => updateParam('sort', event.target.value)}
            className={`${selectClass} max-w-[160px]`}
          >
            <option value="occurredAt,desc">Mới nhất</option>
            <option value="occurredAt,asc">Cũ nhất</option>
          </select>
          <span className="text-[11px] text-outline">Khoảng: {rangeLabel}</span>
        </div>
      </form>

      {loading && <AdminLoading label="Đang tải lịch sử audit" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && result?.items.length === 0 && (
        <AdminEmptyState title="Chưa có audit event" detail="Không có sự kiện nào phù hợp với bộ lọc." />
      )}
      {!loading && !error && result && result.items.length > 0 && (
        <div className="mb-space-md overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-container-lowest text-[11px] font-semibold uppercase tracking-wider text-outline">
                  <th className="whitespace-nowrap px-3 py-2">Thời điểm (UTC+7)</th>
                  <th className="whitespace-nowrap px-3 py-2">Người thực hiện</th>
                  <th className="whitespace-nowrap px-3 py-2">Hành động</th>
                  <th className="whitespace-nowrap px-3 py-2">Đối tượng ảnh hưởng</th>
                  <th className="whitespace-nowrap px-3 py-2">Địa chỉ IP &amp; Vị trí</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {result.items.map((event) => {
                  const ip = eventIp(event)
                  const location = eventLocation(event)
                  const name = event.actorName ?? 'Không có tên'
                  const email = event.actorEmailMasked ?? event.actorId
                  return (
                    <tr key={event.id} className="transition-colors hover:bg-surface-container/60">
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <MaterialIcon name="lock" className="text-[14px] text-primary" />
                          <span className="font-mono text-[11px] text-on-surface">{formatOccurredAt(event.occurredAt)}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                            {initials(event.actorName, event.actorId)}
                          </div>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-xs font-semibold leading-none text-on-surface">{name}</span>
                            <span className="truncate font-mono text-[10px] leading-none text-outline">{email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${actionTone(event.action)}`}
                        >
                          <span className="h-1 w-1 rounded-full bg-current" />
                          {event.action}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[10px] font-semibold text-on-surface">
                            {event.entityType}
                          </span>
                          <span className="max-w-[140px] truncate font-mono text-[10px] text-primary" title={event.entityId}>
                            {event.entityId}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[11px] text-on-surface">{ip ?? '—'}</span>
                          <span className="text-[10px] text-outline">{location ?? 'Không có vị trí'}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1 text-[11px] font-semibold text-on-surface transition-all hover:bg-surface-variant" onClick={function () { setSelected(event) }}>Xem chi tiết</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-between gap-2 bg-surface-container-low p-3 sm:flex-row">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-outline">
                Hiển thị {pageFrom} - {pageTo} trong {result.totalItems.toLocaleString('vi-VN')} bản ghi
              </span>
            </div>
            <AdminPagination
              variant="stitch"
              page={result.page}
              totalPages={result.totalPages}
              totalItems={result.totalItems}
              onPageChange={(page) => updateParam('page', page > 0 ? String(page + 1) : '')}
            />
          </div>
        </div>
      )}

      {selected && (
        <AdminModal
          title={`Đối soát thay đổi: ${selected.action}`}
          subtitle={`${selected.entityType} · ${selected.entityId} · ${formatOccurredAt(selected.occurredAt)}`}
          icon="difference"
          wide
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-on-surface-variant">Người thực hiện</dt>
                <dd className="text-on-surface">
                  {selected.actorName ?? 'Không có tên'} · {selected.actorEmailMasked ?? selected.actorId}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Thời điểm</dt>
                <dd className="text-on-surface">{formatOccurredAt(selected.occurredAt)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Hành động</dt>
                <dd className="text-on-surface">{selected.action}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Đối tượng</dt>
                <dd className="text-on-surface">
                  {selected.entityType} · {selected.entityId}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Địa chỉ IP</dt>
                <dd className="font-mono text-on-surface">{eventIp(selected) ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Vị trí</dt>
                <dd className="text-on-surface">{eventLocation(selected) ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Phiên bản</dt>
                <dd className="text-on-surface">
                  {selected.oldRowVersion ?? '—'} → {selected.newRowVersion ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Lý do</dt>
                <dd className="text-on-surface">{selected.reason ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-on-surface-variant">Hash SHA-256</dt>
                <dd className="break-all font-mono text-[12px] text-on-surface" title={selected.eventHash ?? undefined}>
                  {selected.eventHash ?? '—'}
                </dd>
                {selected.prevEventHash && (
                  <p className="mt-1 break-all font-mono text-[11px] text-outline" title={selected.prevEventHash}>
                    prev: {shortHash(selected.prevEventHash)}
                  </p>
                )}
              </div>
            </dl>
            <div>
              <h3 className="mb-2 font-bold text-on-surface">Trước thay đổi</h3>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container-high p-3 text-[13px] text-on-surface-variant">
                {(() => {
                  const before = snapshotFromEvent(selected, 'before')
                  return before ? JSON.stringify(before, null, 2) : 'Không có dữ liệu trước thay đổi.'
                })()}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-on-surface">Sau thay đổi</h3>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container-high p-3 text-[13px] text-on-surface-variant">
                {(() => {
                  const after = snapshotFromEvent(selected, 'after')
                  return after ? JSON.stringify(after, null, 2) : 'Không có dữ liệu sau thay đổi.'
                })()}
              </pre>
            </div>
            {selected.metadata && (
              <details>
                <summary className="cursor-pointer font-bold text-on-surface">Dữ liệu kỹ thuật</summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container-high p-3 text-[13px] text-on-surface-variant">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </AdminModal>
      )}
    </section>
  )
}
