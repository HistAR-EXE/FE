import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminPagination } from '../components/admin/AdminPagination'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { adminApi, type AdminContentType, type AdminTrashItem, type PageResponse } from '../features/admin/api'
import { dispatchAdminTrashChanged } from '../features/admin/events'
import { createLatestRequestGuard, parseAdminListState } from '../features/admin/state'
import { locationsApi, type Location } from '../features/locations/api'
import { ApiError } from '../shared/api/contracts'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

const RETENTION_DAYS = 30

const TYPES: Array<{ value: AdminContentType | ''; label: string; code: string }> = [
  { value: '', label: 'Mọi loại', code: '' },
  { value: 'DISCOVERY_POINT', label: 'Điểm khám phá', code: 'POI' },
  { value: 'ARTIFACT', label: 'Hiện vật', code: 'ART' },
  { value: 'QUEST', label: 'Nhiệm vụ', code: 'QST' },
]

const inputClass =
  'rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface'

function objectCode(item: AdminTrashItem) {
  const prefix =
    TYPES.find((type) => type.value === item.resourceType)?.code ??
    item.resourceType.slice(0, 3)
  return `#${prefix}-${item.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`
}

function daysUntilPurge(deletedAt: string) {
  const deleted = new Date(deletedAt).getTime()
  if (Number.isNaN(deleted)) return null
  const expires = deleted + RETENTION_DAYS * 24 * 60 * 60 * 1000
  return Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000))
}

function typeTone(resourceType: AdminContentType) {
  if (resourceType === 'DISCOVERY_POINT') return 'text-primary'
  if (resourceType === 'ARTIFACT') return 'text-tertiary'
  return 'text-secondary'
}

export function AdminTrashPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = parseAdminListState(searchParams)
  const [result, setResult] = useState<PageResponse<AdminTrashItem> | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<AdminTrashItem | null>(null)
  const [search, setSearch] = useState(state.q)
  const requestGuard = useRef(createLatestRequestGuard())
  const { showToast } = useToast()

  const locationNameById = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations],
  )

  const load = useCallback(() => {
    const request = requestGuard.current.begin()
    setLoading(true)
    setError(null)
    adminApi
      .listTrash(state)
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
  }, [state.page, state.q, state.size, state.sort, state.type])

  useEffect(() => {
    load()
    return () => requestGuard.current.invalidate()
  }, [load])

  useEffect(() => setSearch(state.q), [state.q])

  useEffect(() => {
    locationsApi
      .list({ size: 100 })
      .then(setLocations)
      .catch(() => setLocations([]))
  }, [])

  const updateParam = (key: string, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const restore = async (item: AdminTrashItem) => {
    setRestoreError(null)
    setRestoringId(item.id)
    try {
      await adminApi.restoreContent(item.resourceType, item.id, {
        rowVersion: item.rowVersion,
        idempotencyKey: crypto.randomUUID(),
      })
      showToast({
        message: `Đã khôi phục ${objectCode(item)} (${item.name}) về kho dữ liệu vận hành.`,
        type: 'success',
      })
      dispatchAdminTrashChanged()
      setRestoreTarget(null)
      load()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setRestoreError(
          cause.code === 'PARENT_DELETED'
            ? 'PARENT_DELETED: Bản ghi cha đang ở thùng rác. Hãy khôi phục bản ghi cha trước.'
            : 'RESTORE_CONFLICT: Khóa unique đã được dùng hoặc dữ liệu đã thay đổi. Kiểm tra bản ghi đang hoạt động, tải lại danh sách rồi thử lại.',
        )
      } else {
        setRestoreError(getFriendlyErrorMessage(cause, 'quest'))
      }
    } finally {
      setRestoringId(null)
    }
  }

  const hasActiveFilters = Boolean(state.q || state.type)

  return (
    <section className="flex w-full flex-col space-y-space-lg pb-16" aria-busy={loading}>
      <AdminPageHeader
        eyebrow="/admin/trash · Lưu trữ xóa mềm 30 ngày"
        title="Thùng rác hệ thống & Khôi phục dữ liệu"
        description="Quản lý điểm khám phá, nhiệm vụ và hiện vật đã xóa mềm. Dữ liệu tự động hết hạn lưu trữ sau 30 ngày — hiện chỉ hỗ trợ khôi phục từ API."
        actions={
          <button
            type="button"
            onClick={() =>
              showToast({
                message:
                  'Chưa có API dọn sạch / xóa vĩnh viễn. Dùng Khôi phục cho từng mục; hệ thống tự hủy sau 30 ngày.',
                type: 'error',
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-error-container px-space-md py-2 font-headline-sm text-headline-sm text-on-error-container hover:opacity-90"
          >
            <MaterialIcon name="delete_forever" className="text-[18px]" />
            Dọn sạch thùng rác
          </button>
        }
      />

      <form
        className="flex flex-col gap-space-md rounded-xl bg-surface-container-low px-space-md py-space-md shadow-md sm:flex-row sm:flex-wrap sm:items-center"
        onSubmit={(event) => {
          event.preventDefault()
          updateParam('q', search.trim())
        }}
      >
        <div className="relative min-w-56 flex-1">
          <MaterialIcon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
          />
          <input
            aria-label="Tìm trong thùng rác"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên…"
            className={`${inputClass} w-full py-2 pl-9 pr-3`}
          />
        </div>
        <select
          aria-label="Lọc loại nội dung"
          value={state.type}
          onChange={(event) => updateParam('type', event.target.value)}
          className={inputClass}
        >
          {TYPES.map((type) => (
            <option key={type.value || 'all'} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Sắp xếp thùng rác"
          value={state.sort || 'deletedAt,desc'}
          onChange={(event) => updateParam('sort', event.target.value)}
          className={inputClass}
        >
          <option value="deletedAt,desc">Mới xóa trước</option>
          <option value="deletedAt,asc">Cũ nhất trước</option>
          <option value="name,asc">Tên A–Z</option>
        </select>
        <button type="submit" className="ops-btn-primary justify-center px-4 py-2">
          Tìm
        </button>
      </form>

      {restoreError && (
        <div
          role="alert"
          className="rounded-lg border border-error/40 bg-error-container/40 p-3 font-body-sm text-body-sm text-error"
        >
          {restoreError}
        </div>
      )}
      {loading && <AdminLoading label="Đang tải thùng rác" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && result?.items.length === 0 && (
        <AdminEmptyState
          title="Thùng rác trống"
          detail={
            hasActiveFilters
              ? 'Không có bản ghi đã xóa phù hợp với bộ lọc.'
              : 'Thùng rác hiện đang trống. Mọi dữ liệu di sản đều đang hoạt động ổn định.'
          }
        />
      )}
      {!loading && !error && result && result.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl bg-surface-container-low shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-lowest font-label-sm text-label-sm uppercase tracking-wider text-outline">
                    <th className="px-space-md py-3">Mã đối tượng</th>
                    <th className="px-space-md py-3">Tên nội dung &amp; Lý do xóa</th>
                    <th className="px-space-md py-3">Phân loại</th>
                    <th className="px-space-md py-3">Người xóa &amp; Thời điểm</th>
                    <th className="px-space-md py-3">Thời hạn hủy</th>
                    <th className="px-space-md py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/40">
                  {result.items.map((item) => {
                    const daysLeft = daysUntilPurge(item.deletedAt)
                    const typeLabel =
                      TYPES.find((type) => type.value === item.resourceType)?.label ??
                      item.resourceType
                    const site =
                      (item.locationId && locationNameById.get(item.locationId)) ||
                      null
                    return (
                      <tr
                        key={`${item.resourceType}-${item.id}`}
                        className="transition-colors hover:bg-surface-container"
                      >
                        <td
                          className={`px-space-md py-3.5 font-code-sm text-code-sm font-semibold ${typeTone(item.resourceType)}`}
                        >
                          {objectCode(item)}
                        </td>
                        <td className="px-space-md py-3.5">
                          <div className="flex max-w-md flex-col">
                            <span className="font-headline-sm text-headline-sm text-on-surface">
                              {item.name}
                            </span>
                            <span className="mt-0.5 font-body-sm text-body-sm text-outline">
                              {item.deleteReason || 'Không có lý do xóa.'}
                            </span>
                          </div>
                        </td>
                        <td className="px-space-md py-3.5">
                          <span className="rounded bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm text-on-surface">
                            {TYPES.find((type) => type.value === item.resourceType)?.code ??
                              item.resourceType}
                            {site ? ` • ${site}` : ''}
                            {!site ? ` • ${typeLabel}` : ''}
                          </span>
                        </td>
                        <td className="px-space-md py-3.5 font-code-sm text-code-sm text-outline">
                          <div className="text-on-surface">
                            {item.deletedByName ?? 'Không có tên hiển thị'}
                          </div>
                          {!item.deletedByName && (
                            <div className="text-outline">{item.deletedBy}</div>
                          )}
                          <div>
                            {new Date(item.deletedAt).toLocaleString('vi-VN')}
                          </div>
                        </td>
                        <td className="px-space-md py-3.5">
                          {daysLeft == null ? (
                            <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm text-on-surface-variant">
                              —
                            </span>
                          ) : daysLeft <= 0 ? (
                            <span className="rounded-full bg-error-container/40 px-2 py-0.5 font-code-sm text-code-sm font-semibold text-error">
                              Hết hạn lưu trữ
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-2 py-0.5 font-code-sm text-code-sm font-semibold ${
                                daysLeft <= 3
                                  ? 'bg-error-container/40 text-error'
                                  : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              Còn {daysLeft} ngày
                            </span>
                          )}
                        </td>
                        <td className="px-space-md py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={restoringId === item.id}
                              onClick={() => setRestoreTarget(item)}
                              className="ops-btn-primary inline-flex items-center gap-1 px-3 py-1.5 disabled:opacity-50"
                            >
                              <MaterialIcon
                                name="restore_from_trash"
                                className="text-[15px]"
                              />
                              {restoringId === item.id ? 'Đang khôi phục…' : 'Khôi phục'}
                            </button>
                            <button
                              type="button"
                              title="Xóa vĩnh viễn chưa có trên API"
                              onClick={() =>
                                showToast({
                                  message:
                                    'Xóa vĩnh viễn từng mục chưa được hỗ trợ. Hệ thống tự hủy sau 30 ngày lưu trữ.',
                                  type: 'error',
                                })
                              }
                              className="rounded-lg bg-surface-container-highest p-1.5 text-error transition-colors hover:bg-error-container hover:text-on-error-container"
                            >
                              <MaterialIcon name="delete_forever" className="text-[16px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <AdminPagination
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.totalItems}
            onPageChange={(page) =>
              updateParam('page', page > 0 ? String(page + 1) : '')
            }
          />
        </>
      )}
      {restoreTarget && (
        <AdminModal title="Xác nhận khôi phục" onClose={() => setRestoreTarget(null)}>
          <div className="space-y-4">
            <p className="font-body-md text-body-md text-on-surface">
              Khôi phục “{restoreTarget.name}” ({objectCode(restoreTarget)}) về danh sách đang
              hoạt động?
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Nếu khóa unique đã được dùng hoặc bản ghi cha còn trong thùng rác, hệ thống sẽ từ
              chối và hướng dẫn cách xử lý.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={restoringId === restoreTarget.id}
                onClick={() => void restore(restoreTarget)}
                className="ops-btn-primary disabled:opacity-50"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </section>
  )
}
