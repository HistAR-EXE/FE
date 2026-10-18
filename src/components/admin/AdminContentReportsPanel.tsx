import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, type AdminContentReport, type PageResponse } from '../../features/admin/api'
import { getFriendlyErrorMessage } from '../../shared/api/errorMessages'
import { MaterialIcon } from '../ui/MaterialIcon'
import { AdminEmptyState, AdminErrorState, AdminLoading } from './AdminAsyncState'
import { AdminModal } from './AdminModal'
import { AdminPagination } from './AdminPagination'

const statuses = ['NEW', 'IN_REVIEW', 'RESOLVED', 'REJECTED'] as const
const inputClass = 'rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-body-md text-body-md text-on-surface'
const btnPrimary = 'ops-btn-primary disabled:opacity-50'

function statusPill(status: string | null | undefined) {
  if (status === 'RESOLVED') return 'ops-pill ops-pill-success'
  if (status === 'REJECTED') return 'ops-pill ops-pill-danger'
  if (status === 'IN_REVIEW') return 'ops-pill ops-pill-warn'
  return 'ops-pill ops-pill-neutral'
}

export function AdminContentReportsPanel() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(Number(params.get('page') ?? '1') - 1, 0)
  const status = params.get('status') ?? ''
  const q = params.get('q') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const [result, setResult] = useState<PageResponse<AdminContentReport> | null>(null)
  const [selected, setSelected] = useState<AdminContentReport | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [nextStatus, setNextStatus] = useState('NEW')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateParam = (key: string, value: string) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    return next
  })
  const load = useCallback(() => {
    setLoading(true); setError(null)
    adminApi.listContentReports({ page, size: 20, status: status || undefined, q: q || undefined, from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined })
      .then(setResult)
      .catch((cause) => { setResult(null); setError(getFriendlyErrorMessage(cause, 'quest')) })
      .finally(() => setLoading(false))
  }, [from, page, q, status, to])
  useEffect(() => load(), [load])

  const open = (item: AdminContentReport) => {
    setSelected(item)
    setAdminNote(item.adminNote ?? '')
    setNextStatus(item.status ?? item.statusHint ?? 'NEW')
  }
  const save = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await adminApi.updateContentReport(selected.eventId ?? selected.id!, { status: nextStatus, adminNote: adminNote.trim() || null, rowVersion: selected.rowVersion })
      setSelected(null)
      load()
    } catch (cause) { setError(getFriendlyErrorMessage(cause, 'quest')) }
    finally { setSaving(false) }
  }

  return (
    <section data-testid="admin-content-reports" className="space-y-space-md" aria-busy={loading}>
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Báo sai dữ liệu</h2>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Hàng đợi báo cáo nội dung từ khách tham quan.</p>
      </div>

      <div className="grid gap-3 rounded-xl bg-surface-container-low p-space-lg sm:grid-cols-2 lg:grid-cols-5">
        <input aria-label="Tìm báo cáo" value={q} onChange={(event) => updateParam('q', event.target.value)} placeholder="Trạm, nội dung…" className={inputClass} />
        <select aria-label="Trạng thái báo cáo" value={status} onChange={(event) => updateParam('status', event.target.value)} className={inputClass}>
          <option value="">Mọi trạng thái</option>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <label className="font-label-sm text-label-sm text-outline">
          Từ ngày
          <input type="date" value={from} onChange={(event) => updateParam('from', event.target.value)} className={`mt-1 w-full ${inputClass}`} />
        </label>
        <label className="font-label-sm text-label-sm text-outline">
          Đến ngày
          <input type="date" value={to} onChange={(event) => updateParam('to', event.target.value)} className={`mt-1 w-full ${inputClass}`} />
        </label>
        <button type="button" onClick={load} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 font-label-sm text-label-sm text-on-surface">
          <MaterialIcon name="refresh" className="text-[16px]" />
          Làm mới
        </button>
      </div>

      {loading && <AdminLoading label="Đang tải báo cáo nội dung" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && result?.items.length === 0 && <AdminEmptyState title="Không có báo cáo" detail="Không có báo cáo phù hợp với bộ lọc." />}
      {!loading && !error && result && result.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl bg-surface-container-low shadow-sm">
            <table className="ops-table w-full text-left font-body-md text-body-md">
              <thead>
                <tr>
                  {['Thời điểm', 'Trạm', 'Trạng thái', 'Ghi chú', 'Thao tác'].map((label) => (
                    <th key={label} className="px-4 py-3 font-label-sm text-label-sm uppercase tracking-wider">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.eventId ?? item.id} className="hover:bg-surface-container/60">
                    <td className="px-4 py-3 whitespace-nowrap font-code-sm text-code-sm text-on-surface-variant">
                      {new Date(item.occurredAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 font-headline-sm text-on-surface">{item.stationCode ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={statusPill(item.status ?? item.statusHint)}>
                        {item.status ?? item.statusHint ?? '—'}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-on-surface-variant">{item.adminNote ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => open(item)} className="ops-icon-btn" aria-label="Xem chi tiết" title="Xem chi tiết">
                        <MaterialIcon name="visibility" className="text-[16px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.totalItems}
            onPageChange={(next) => updateParam('page', next ? String(next + 1) : '')}
          />
        </>
      )}

      {selected && (
        <AdminModal title="Chi tiết báo cáo nội dung" onClose={() => setSelected(null)} wide>
          <div className="space-y-4 font-body-sm text-body-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-label-sm text-label-sm text-outline">Trạm</dt>
                <dd className="mt-1 text-on-surface">{selected.stationCode ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-label-sm text-label-sm text-outline">Phiên</dt>
                <dd className="mt-1 font-mono text-secondary">{selected.sessionId ?? '—'}</dd>
              </div>
            </dl>
            <div>
              <p className="font-label-sm text-label-sm text-outline">Nội dung báo cáo</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-container p-3 text-on-surface">
                {selected.payload || 'Không có nội dung.'}
              </p>
            </div>
            <label className="block">
              <span className="font-label-sm text-label-sm text-outline">Trạng thái</span>
              <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className={`mt-1 w-full ${inputClass}`}>
                {statuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="font-label-sm text-label-sm text-outline">Ghi chú quản trị</span>
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                rows={4}
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <div className="flex justify-end">
              <button type="button" disabled={saving} onClick={() => void save()} className={btnPrimary}>
                {saving ? 'Đang lưu…' : 'Lưu cập nhật'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </section>
  )
}
