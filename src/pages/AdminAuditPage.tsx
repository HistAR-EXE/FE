import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPagination } from '../components/admin/AdminPagination'
import { adminApi, type AdminAuditEvent, type PageResponse } from '../features/admin/api'
import { createLatestRequestGuard, parseAdminListState } from '../features/admin/state'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

export function AdminAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = parseAdminListState(searchParams)
  const action = searchParams.get('action')?.trim() ?? ''
  const actorId = searchParams.get('actorId')?.trim() ?? ''
  const [result, setResult] = useState<PageResponse<AdminAuditEvent> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(state.q)
  const [actorSearch, setActorSearch] = useState(actorId)
  const [selected, setSelected] = useState<AdminAuditEvent | null>(null)
  const requestGuard = useRef(createLatestRequestGuard())

  const load = useCallback(() => {
    const request = requestGuard.current.begin()
    setLoading(true)
    setError(null)
    adminApi.listAudit({ ...state, entityType: state.type || undefined, actorId: actorId || undefined, action: action || undefined })
      .then((next) => { if (request.isLatest()) setResult(next) })
      .catch((cause) => {
        if (!request.isLatest()) return
        setResult(null)
        setError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => { if (request.isLatest()) setLoading(false) })
  }, [action, actorId, state.page, state.q, state.size, state.sort, state.type])

  useEffect(() => {
    load()
    return () => requestGuard.current.invalidate()
  }, [load])
  useEffect(() => setSearch(state.q), [state.q])
  useEffect(() => setActorSearch(actorId), [actorId])

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
      const entityId = search.trim()
      const nextActorId = actorSearch.trim()
      if (entityId) next.set('q', entityId)
      else next.delete('q')
      if (nextActorId) next.set('actorId', nextActorId)
      else next.delete('actorId')
      next.delete('page')
      return next
    })
  }

  return (
    <section className="w-full max-w-7xl space-y-5" aria-busy={loading}>
      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => { event.preventDefault(); applySearch() }}>
        <input aria-label="Tìm theo entity ID" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entity ID chính xác" className="rounded-lg border border-slate-300 px-3 py-2" />
        <select aria-label="Loại entity" value={state.type} onChange={(event) => updateParam('type', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Mọi entity</option><option value="DISCOVERY_POINT">Điểm khám phá</option><option value="ARTIFACT">Hiện vật</option><option value="QUEST">Nhiệm vụ</option><option value="NARRATIVE_INVESTIGATION">Narrative</option></select>
        <input aria-label="Actor ID" value={actorSearch} onChange={(event) => setActorSearch(event.target.value)} placeholder="Actor ID" className="rounded-lg border border-slate-300 px-3 py-2" />
        <select aria-label="Hành động audit" value={action} onChange={(event) => updateParam('action', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Mọi hành động</option><option value="CREATED">CREATED</option><option value="UPDATED">UPDATED</option><option value="SOFT_DELETED">SOFT_DELETED</option><option value="RESTORED">RESTORED</option><option value="REVIEWED">REVIEWED</option></select>
        <div className="flex gap-2"><select aria-label="Sắp xếp audit" value={state.sort || 'occurredAt,desc'} onChange={(event) => updateParam('sort', event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="occurredAt,desc">Mới nhất</option><option value="occurredAt,asc">Cũ nhất</option></select><button type="submit" className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-950">Tìm</button></div>
      </form>

      {loading && <AdminLoading label="Đang tải lịch sử audit" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && result?.items.length === 0 && <AdminEmptyState title="Chưa có audit event" detail="Không có sự kiện nào phù hợp với bộ lọc." />}
      {!loading && !error && result && result.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead className="bg-slate-100"><tr>{['Thời điểm', 'Actor', 'Hành động', 'Entity', 'Version', 'Lý do'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>
            {result.items.map((event) => <tr key={event.id} tabIndex={0} role="button" onClick={() => setSelected(event)} onKeyDown={(keyEvent) => { if (keyEvent.key === 'Enter' || keyEvent.key === ' ') { keyEvent.preventDefault(); setSelected(event) } }} className="cursor-pointer border-t border-slate-200 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"><td className="p-3 whitespace-nowrap">{new Date(event.occurredAt).toLocaleString('vi-VN')}</td><td className="p-3">{event.actorName ?? event.actorId}</td><td className="p-3 font-semibold">{event.action}</td><td className="p-3"><p>{event.entityType}</p><p className="font-mono text-xs text-slate-600">{event.entityId}</p></td><td className="p-3">{event.oldRowVersion ?? '—'} → {event.newRowVersion ?? '—'}</td><td className="max-w-xs truncate p-3">{event.reason ?? '—'}</td></tr>)}
          </tbody></table></div>
          <AdminPagination page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} onPageChange={(page) => updateParam('page', page > 0 ? String(page + 1) : '')} />
        </>
      )}

      {selected && <AdminModal title="Chi tiết audit" onClose={() => setSelected(null)} wide><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-600">Event ID</dt><dd className="break-all font-mono">{selected.id}</dd></div><div><dt className="text-slate-600">Thời điểm</dt><dd>{new Date(selected.occurredAt).toLocaleString('vi-VN')}</dd></div><div><dt className="text-slate-600">Actor</dt><dd>{selected.actorName ?? selected.actorId}</dd></div><div><dt className="text-slate-600">Hành động</dt><dd>{selected.action}</dd></div><div><dt className="text-slate-600">Entity</dt><dd>{selected.entityType} · {selected.entityId}</dd></div><div><dt className="text-slate-600">Version</dt><dd>{selected.oldRowVersion ?? '—'} → {selected.newRowVersion ?? '—'}</dd></div><div className="sm:col-span-2"><dt className="text-slate-600">Lý do</dt><dd>{selected.reason ?? '—'}</dd></div>{selected.metadata && <div className="sm:col-span-2"><dt className="text-slate-600">Metadata</dt><dd><pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-slate-100 p-3 text-xs whitespace-pre-wrap">{JSON.stringify(selected.metadata, null, 2)}</pre></dd></div>}</dl></AdminModal>}
    </section>
  )
}
