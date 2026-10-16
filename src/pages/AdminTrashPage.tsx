import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminPagination } from '../components/admin/AdminPagination'
import { adminApi, type AdminContentType, type AdminTrashItem, type PageResponse } from '../features/admin/api'
import { createLatestRequestGuard, parseAdminListState } from '../features/admin/state'
import { ApiError } from '../shared/api/contracts'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

const TYPES: Array<{ value: AdminContentType | ''; label: string }> = [
  { value: '', label: 'Mọi loại' },
  { value: 'DISCOVERY_POINT', label: 'Điểm khám phá' },
  { value: 'ARTIFACT', label: 'Hiện vật' },
  { value: 'QUEST', label: 'Nhiệm vụ' },
]

export function AdminTrashPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = parseAdminListState(searchParams)
  const [result, setResult] = useState<PageResponse<AdminTrashItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [search, setSearch] = useState(state.q)
  const requestGuard = useRef(createLatestRequestGuard())
  const { showToast } = useToast()

  const load = useCallback(() => {
    const request = requestGuard.current.begin()
    setLoading(true)
    setError(null)
    adminApi.listTrash(state).then((next) => {
      if (request.isLatest()) setResult(next)
    }).catch((cause) => {
      if (!request.isLatest()) return
      setResult(null)
      setError(getFriendlyErrorMessage(cause, 'quest'))
    }).finally(() => {
      if (request.isLatest()) setLoading(false)
    })
  }, [state.page, state.q, state.size, state.sort, state.type])

  useEffect(() => {
    load()
    return () => requestGuard.current.invalidate()
  }, [load])
  useEffect(() => setSearch(state.q), [state.q])

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
    if (!window.confirm(`Khôi phục “${item.name}”?`)) return
    setRestoreError(null)
    setRestoringId(item.id)
    try {
      await adminApi.restoreContent(item.resourceType, item.id, {
        rowVersion: item.rowVersion,
        idempotencyKey: crypto.randomUUID(),
      })
      showToast({ message: 'Đã khôi phục nội dung.', type: 'success' })
      load()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setRestoreError(cause.code === 'PARENT_DELETED' ? 'Bản ghi cha đang ở thùng rác. Hãy khôi phục bản ghi cha trước.' : 'Dữ liệu đã thay đổi hoặc bị trùng khóa. Tải lại danh sách rồi thử lại.')
      } else {
        setRestoreError(getFriendlyErrorMessage(cause, 'quest'))
      }
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <section className="w-full max-w-6xl space-y-5" aria-busy={loading}>
      <form className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4" onSubmit={(event) => { event.preventDefault(); updateParam('q', search.trim()) }}>
        <input aria-label="Tìm trong thùng rác" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên…" className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2" />
        <select aria-label="Lọc loại nội dung" value={state.type} onChange={(event) => updateParam('type', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2">{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <select aria-label="Sắp xếp thùng rác" value={state.sort || 'deletedAt,desc'} onChange={(event) => updateParam('sort', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="deletedAt,desc">Mới xóa trước</option><option value="deletedAt,asc">Cũ nhất trước</option><option value="name,asc">Tên A–Z</option></select>
        <button type="submit" className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-950 hover:bg-amber-400">Tìm</button>
      </form>

      {restoreError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{restoreError}</div>}
      {loading && <AdminLoading label="Đang tải thùng rác" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && result?.items.length === 0 && <AdminEmptyState title="Thùng rác trống" detail="Không có bản ghi đã xóa phù hợp với bộ lọc." />}
      {!loading && !error && result && result.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm"><thead className="bg-slate-100"><tr>{['Loại', 'Tên', 'Người xóa', 'Lý do', 'Thời điểm', ''].map((label) => <th key={label || 'action'} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>
              {result.items.map((item) => <tr key={`${item.resourceType}-${item.id}`} className="border-t border-slate-200"><td className="p-3">{TYPES.find((type) => type.value === item.resourceType)?.label ?? item.resourceType}</td><td className="p-3 font-semibold">{item.name}</td><td className="p-3 font-mono text-xs">{item.deletedBy}</td><td className="max-w-xs p-3">{item.deleteReason}</td><td className="p-3 whitespace-nowrap">{new Date(item.deletedAt).toLocaleString('vi-VN')}</td><td className="p-3"><button type="button" disabled={restoringId === item.id} onClick={() => void restore(item)} className="rounded-lg border border-emerald-300 px-3 py-2 font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{restoringId === item.id ? 'Đang khôi phục…' : 'Khôi phục'}</button></td></tr>)}
            </tbody></table>
          </div>
          <AdminPagination page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} onPageChange={(page) => updateParam('page', page > 0 ? String(page + 1) : '')} />
        </>
      )}
    </section>
  )
}
