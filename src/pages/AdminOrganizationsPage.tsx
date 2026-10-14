import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { adminApi, type AdminOrganizationSummary, type OrganizationAnalytics } from '../features/admin/api'
import { orgApi, type OrgRosterMember } from '../features/org/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { createLatestRequestGuard } from '../features/admin/state'

export function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<AdminOrganizationSummary[]>([])
  const [orgId, setOrgId] = useState('')
  const [data, setData] = useState<OrganizationAnalytics | null>(null)
  const [roster, setRoster] = useState<OrgRosterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const organizationsGuard = useRef(createLatestRequestGuard())
  const detailsGuard = useRef(createLatestRequestGuard())

  const loadOrganizations = useCallback(() => {
    const request = organizationsGuard.current.begin()
    setLoading(true)
    setError(null)
    adminApi
      .listOrganizations()
      .then((items) => {
        if (!request.isLatest()) return
        setOrganizations(items)
        setOrgId((current) => current || items[0]?.id || '')
      })
      .catch((cause) => {
        if (!request.isLatest()) return
        setOrganizations([])
        setError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => { if (request.isLatest()) setLoading(false) })
  }, [])

  const loadDetails = useCallback(() => {
    if (!orgId) return
    const request = detailsGuard.current.begin()
    setDetailLoading(true)
    setDetailError(null)
    Promise.all([adminApi.organizationAnalytics(orgId), orgApi.roster(orgId)])
      .then(([analytics, members]) => {
        if (!request.isLatest()) return
        setData(analytics)
        setRoster(members)
      })
      .catch((cause) => {
        if (!request.isLatest()) return
        setData(null)
        setRoster([])
        setDetailError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => { if (request.isLatest()) setDetailLoading(false) })
  }, [orgId])

  useEffect(() => {
    loadOrganizations()
    return () => organizationsGuard.current.invalidate()
  }, [loadOrganizations])
  useEffect(() => {
    loadDetails()
    return () => detailsGuard.current.invalidate()
  }, [loadDetails])

  return (
    <section className="w-full max-w-6xl space-y-5" aria-busy={loading || detailLoading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Chọn tổ chức để xem tổng quan và danh sách thành viên.</p>
        <Link to="/teacher" className="text-sm font-semibold text-amber-800 underline hover:no-underline">Xem giao diện giáo viên</Link>
      </div>

      {loading && <AdminLoading label="Đang tải danh sách tổ chức" />}
      {!loading && error && <AdminErrorState message={error} onRetry={loadOrganizations} />}
      {!loading && !error && organizations.length === 0 && (
        <AdminEmptyState title="Chưa có tổ chức" detail="Khi tổ chức đầu tiên được tạo, dữ liệu sẽ xuất hiện tại đây." />
      )}

      {!loading && !error && organizations.length > 0 && (
        <>
          <label className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-800">
            Chọn tổ chức
            <select value={orgId} onChange={(event) => setOrgId(event.target.value)} className="min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2">
              {organizations.map((org) => <option key={org.id} value={org.id}>{org.name} ({org.memberCount ?? 0})</option>)}
            </select>
          </label>

          {detailLoading && <AdminLoading label="Đang tải chi tiết tổ chức" />}
          {!detailLoading && detailError && <AdminErrorState message={detailError} onRetry={loadDetails} />}
          {!detailLoading && !detailError && data && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">{data.name}</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-slate-600">Loại</dt><dd className="font-semibold">{data.orgType}</dd></div>
                <div><dt className="text-slate-600">Thành viên</dt><dd className="font-semibold">{data.memberCount}</dd></div>
                <div><dt className="text-slate-600">Hoàn thành nhiệm vụ</dt><dd className="font-semibold">{data.completionRatePct}%</dd></div>
                <div><dt className="text-slate-600">Full tour Củ Chi</dt><dd className="font-semibold">{data.fullTourRatePct}%</dd></div>
              </dl>
              {data.note && <p className="mt-4 text-xs text-slate-600">{data.note}</p>}
            </div>
          )}

          {!detailLoading && !detailError && (
            roster.length === 0 ? (
              <AdminEmptyState title="Chưa có thành viên" detail="Tổ chức này chưa có thành viên trong roster." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700"><tr>{['Thành viên', 'Vai trò', 'Cấp', 'XP', 'Nhiệm vụ'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead>
                  <tbody>{roster.map((member) => (
                    <tr key={member.userId} className="border-t border-slate-200">
                      <td className="p-3"><p>{member.displayName}</p><p className="text-xs text-slate-600">{member.email}</p></td>
                      <td className="p-3">{member.orgRole}</td><td className="p-3">{member.level}</td><td className="p-3">{member.totalPoints}</td><td className="p-3">{member.questsCompleted}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </section>
  )
}
