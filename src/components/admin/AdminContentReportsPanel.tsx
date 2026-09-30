import { useCallback, useEffect, useState } from 'react'
import { adminApi, type AdminContentReport } from '../../features/admin/api'
import { getFriendlyErrorMessage } from '../../shared/api/errorMessages'
import { useToast } from '../../shared/ui/toast/useToast'
import { MaterialIcon } from '../ui/MaterialIcon'

/** Admin queue for visitor content_report events (SLA: triage NEW within 48h for BQL). */
export function AdminContentReportsPanel() {
  const [items, setItems] = useState<AdminContentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'REVIEWED'>('ALL')
  const { showToast } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    adminApi
      .listContentReports(30, 100)
      .then(setItems)
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    load()
  }, [load])

  const filtered = items.filter((i) => statusFilter === 'ALL' || i.statusHint === statusFilter)

  return (
    <div data-testid="admin-content-reports" className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-title-md text-on-surface">Báo sai sử liệu</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Queue từ event <code className="text-[10px]">content_report</code> · Lead B2B2C thương mại nằm ở Billing CRM · SLA nội bộ: phản hồi BQL ≤ 48h (NEW →
            REVIEWED trong payload)
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 px-md py-xs rounded-lg border border-outline-variant text-sm"
        >
          <MaterialIcon name="refresh" className="text-sm" /> Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'NEW', 'REVIEWED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border ${
              statusFilter === s
                ? 'border-primary text-primary bg-primary/10'
                : 'border-outline-variant text-on-surface-variant'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Không có báo cáo trong khoảng đã chọn.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-outline-variant bg-surface-container p-md text-sm space-y-1"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="font-bold text-on-surface">
                  {row.stationCode || '—'} ·{' '}
                  <span
                    className={
                      row.statusHint === 'NEW' ? 'text-amber-400' : 'text-emerald-400'
                    }
                  >
                    {row.statusHint}
                  </span>
                </span>
                <time className="text-[10px] text-on-surface-variant">
                  {row.occurredAt ? new Date(row.occurredAt).toLocaleString('vi-VN') : ''}
                </time>
              </div>
              <pre className="text-[11px] text-on-surface-variant whitespace-pre-wrap break-words max-h-32 overflow-auto">
                {row.payload || '(empty payload)'}
              </pre>
              {row.sessionId && (
                <p className="text-[10px] font-mono text-on-surface-variant">session {row.sessionId}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
