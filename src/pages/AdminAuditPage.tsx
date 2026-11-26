import '../styles/admin-audit.css'
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
  'h-10 w-full min-w-0 rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary'
const selectClass =
  'h-10 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-outline-variant bg-white px-3 pr-8 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary'
const btnGhost =
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-surface-container-high px-2.5 text-xs font-semibold text-on-surface hover:bg-surface-variant disabled:opacity-50'
const btnPrimary =
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-container px-2.5 text-xs font-bold text-on-primary-container hover:opacity-95 disabled:opacity-50'

const ENTITY_OPTIONS = [
  { value: '', label: 'Tất cả loại đối tượng' },
  { value: 'DISCOVERY_POINT', label: 'Điểm khám phá' },
  { value: 'ARTIFACT', label: 'Hiện vật' },
  { value: 'QUEST', label: 'Nhiệm vụ' },
  { value: 'NARRATIVE_INVESTIGATION', label: 'Cốt truyện thử nghiệm' },
  { value: 'ORGANIZATION', label: 'Tổ chức' },
  { value: 'USER', label: 'Người dùng và quyền truy cập' },
  { value: 'CONTENT_REPORT', label: 'Báo cáo nội dung' },
  { value: 'BILLING_SETTINGS', label: 'Cấu hình thanh toán' },
  { value: 'B2B2C_INQUIRY', label: 'Yêu cầu tư vấn B2G' },
] as const

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'CREATED', label: 'Đã tạo' },
  { value: 'ORG_MEMBER_ROLE_UPDATED', label: 'Đổi vai trò thành viên' },
  { value: 'UPDATED', label: 'Đã cập nhật' },
  { value: 'SOFT_DELETED', label: 'Đã chuyển vào thùng rác' },
  { value: 'RESTORED', label: 'Đã khôi phục' },
  { value: 'REVIEWED', label: 'Đã xét duyệt' },
  { value: 'STATUS_UPDATED', label: 'Đã đổi trạng thái' },
  { value: 'SETTINGS_UPDATED', label: 'Đã đổi cài đặt' },
  { value: 'ORG_INVITE_GENERATED', label: 'Đã tạo lời mời tổ chức' },
  { value: 'ORG_AR_CARDS_ISSUED', label: 'Đã cấp thẻ AR cho tổ chức' },
  { value: 'USERS_EXPORTED', label: 'Đã xuất danh sách người dùng' },
] as const

const actionLabel = (action: string) => ACTION_OPTIONS.find((option) => option.value === action)?.label ?? action.replaceAll('_', ' ').toLowerCase()
const entityLabel = (entity: string) => ENTITY_OPTIONS.find((option) => option.value === entity)?.label ?? entity.replaceAll('_', ' ').toLowerCase()

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
    <section className="ops-paper-page ops-work-page admin-page flex w-full max-w-7xl flex-col pb-16" aria-busy={loading}>
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
                  {integrityValid === false ? 'Kiểm tra toàn vẹn thất bại' : 'Đã kiểm tra tính toàn vẹn'}
                </p>
                <p className="text-[11px] opacity-90">{integritySummary ?? 'Đã kiểm tra dữ liệu trên máy chủ.'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVerifiedBanner(false)}
              className="rounded-lg p-1 hover:bg-surface-container-high"
              aria-label="Đóng thông báo"
            >
              <MaterialIcon name="close" className="text-[16px]" />
            </button>
          </div>
        </div>
      )}

      <div className="admin-page-header flex flex-col gap-space-sm py-space-sm">
        <div className="flex flex-col justify-between gap-space-sm xl:flex-row xl:items-end">
          <div className="max-w-4xl space-y-1">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-on-surface md:text-2xl">Nhật ký <span className="ops-title-accent">kiểm toán</span></h1>
            <p className="max-w-3xl text-xs leading-relaxed text-on-surface-variant">
              Tra cứu thay đổi quản trị theo đối tượng, người thực hiện và hành động.
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
                Đối tượng: {shortHash(entityIdParam)}
                <MaterialIcon name="close" className="text-[14px]" />
              </button>
            )}
            {actorId && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 font-code-sm text-[11px] text-primary"
                onClick={() => updateParam('actorId', '')}
              >
                Người thực hiện: {shortHash(actorId)}
                <MaterialIcon name="close" className="text-[14px]" />
              </button>
            )}
          </div>
        )}

        <dl className="audit-metrics">
          <div><dt>Bản ghi khớp bộ lọc</dt><dd>{kpis.totalItems.toLocaleString('vi-VN')}</dd><small>{rangeLabel}</small></div>
          <div><dt>Thao tác nhạy cảm</dt><dd>{kpis.sensitive}</dd><small>Trong {kpis.pageCount} bản ghi trên trang</small></div>
          <div><dt>Bản ghi có địa chỉ IP</dt><dd>{kpis.withIp}</dd><small>Trong {kpis.pageCount} bản ghi trên trang</small></div>
        </dl>
      </div>

      <form
        className="mb-space-sm rounded-xl bg-surface-container-low p-3 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          applySearch()
        }}
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <MaterialIcon
              name="tag"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-outline"
            />
            <input
              aria-label="Tìm theo mã đối tượng"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm mã đối tượng..."
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
              aria-label="Hành động quản trị"
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
          <div className="flex min-w-0 gap-2 lg:col-span-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-on-surface-variant">
              Từ ngày
              <input
                type="date"
                value={from}
                onChange={(event) => updateParam('from', event.target.value)}
                className={`mt-0.5 ${inputClass}`}
              />
            </label>
            <label className="min-w-0 flex-1 text-xs font-semibold text-on-surface-variant">
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

      {loading && <AdminLoading label="Đang tải lịch sử thao tác" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && result?.items.length === 0 && (
        <AdminEmptyState title="Chưa có thao tác nào" detail="Không có sự kiện nào phù hợp với bộ lọc." />
      )}
      {!loading && !error && result && result.items.length > 0 && (
        <div className="mb-space-md overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
          <h2 className="audit-list-heading">Lịch sử thao tác</h2>
          <ul className="audit-events">
            {result.items.map((event) => (
              <li key={event.id}>
                <div className="audit-event-main">
                  <span className={`audit-event-icon ${actionTone(event.action)}`}><MaterialIcon name="history" /></span>
                  <div>
                    <h3>{actionLabel(event.action)}</h3>
                    <p>{entityLabel(event.entityType)} <span title={event.entityId}>· {shortHash(event.entityId)}</span></p>
                  </div>
                </div>
                <div><strong>{event.actorName || 'Không có tên'}</strong><p>{event.actorEmailMasked ?? event.actorId}</p></div>
                <div><time dateTime={event.occurredAt}>{formatOccurredAt(event.occurredAt)}</time><p>{[eventIp(event), eventLocation(event)].filter(Boolean).join(' · ') || 'Chưa ghi nhận IP'}</p></div>
                <button type="button" className="audit-detail" onClick={() => setSelected(event)}>Xem chi tiết</button>
              </li>
            ))}
          </ul>
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
          title={actionLabel(selected.action)}
          subtitle={formatOccurredAt(selected.occurredAt)}
          icon="history"
          wide
          onClose={() => setSelected(null)}
        >
          <div className="audit-record">
            <dl className="audit-record-facts">
              <div>
                <dt>Người thực hiện</dt>
                <dd>{selected.actorName || 'Chưa ghi nhận tên'}<small>{selected.actorEmailMasked ?? selected.actorId}</small></dd>
              </div>
              <div>
                <dt>Đối tượng</dt>
                <dd>{entityLabel(selected.entityType)}<small>{selected.entityId}</small></dd>
              </div>
              {selected.reason && <div><dt>Lý do</dt><dd>{selected.reason}</dd></div>}
              <div><dt>Nguồn truy cập</dt><dd>{[eventIp(selected), eventLocation(selected)].filter(Boolean).join(' · ') || 'Chưa ghi nhận'}</dd></div>
            </dl>
            {(snapshotFromEvent(selected, 'before') || snapshotFromEvent(selected, 'after')) && (
              <details>
                <summary tabIndex={0}>Thay đổi trước và sau</summary>
                {(['before', 'after'] as const).map((side) => (
                  <div key={side}>
                    <h3>{side === 'before' ? 'Trước thay đổi' : 'Sau thay đổi'}</h3>
                    <pre>{JSON.stringify(snapshotFromEvent(selected, side), null, 2) ?? 'Chưa ghi nhận'}</pre>
                  </div>
                ))}
              </details>
            )}
            <details>
              <summary tabIndex={0}>Thông tin kỹ thuật</summary>
              <dl className="audit-record-facts">
                {(selected.oldRowVersion != null || selected.newRowVersion != null) && (
                  <div><dt>Phiên bản</dt><dd>{selected.oldRowVersion ?? '—'} → {selected.newRowVersion ?? '—'}</dd></div>
                )}
                <div><dt>Mã toàn vẹn</dt><dd><code>{selected.eventHash || 'Chưa ghi nhận'}</code></dd></div>
                {selected.prevEventHash && <div><dt>Mã bản ghi trước</dt><dd><code>{selected.prevEventHash}</code></dd></div>}
              </dl>
              {selected.metadata && <pre>{JSON.stringify(selected.metadata, null, 2)}</pre>}
            </details>
          </div>
        </AdminModal>
      )}
    </section>
  )
}
