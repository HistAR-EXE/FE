// src/pages/AdminOrganizationsPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { AdminSubNav } from '../components/admin/AdminSubNav'
import { adminApi, type AdminOrganizationSummary, type OrganizationAnalytics } from '../features/admin/api'
import { orgApi, type OrgRosterMember } from '../features/org/api'

export function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<AdminOrganizationSummary[]>([])
  const [orgId, setOrgId] = useState('')
  const [data, setData] = useState<OrganizationAnalytics | null>(null)
  const [roster, setRoster] = useState<OrgRosterMember[]>([])
  const [orgsLoading, setOrgsLoading] = useState(true)

  useEffect(() => {
    setOrgsLoading(true)
    adminApi
      .listOrganizations()
      .then((items) => {
        setOrganizations(items)
        if (items[0]?.id) setOrgId(items[0].id)
      })
      .catch(() => setOrganizations([]))
      .finally(() => setOrgsLoading(false))
  }, [])

  useEffect(() => {
    if (!orgId) {
      setData(null)
      setRoster([])
      return
    }
    adminApi.organizationAnalytics(orgId).then(setData).catch(() => setData(null))
    orgApi.roster(orgId).then(setRoster).catch(() => setRoster([]))
  }, [orgId])

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Tổ chức B2B" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h1 className="font-display-md text-on-surface">Bảng tổ chức</h1>
          <Link to="/teacher" className="text-sm text-secondary underline hover:no-underline">
            Xem giao diện giáo viên
          </Link>
        </div>

        <AdminSubNav />

        {orgsLoading && (
          <div className="h-16 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />
        )}

        {!orgsLoading && organizations.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            Chưa có tổ chức (API /api/admin/organizations chưa trả dữ liệu).
          </p>
        )}

        {organizations.length > 0 && (
          <label className="flex flex-wrap items-center gap-sm text-sm">
            Chọn tổ chức
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg px-md py-sm min-w-[12rem]"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                  {org.memberCount != null ? ` (${org.memberCount})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {data && (
          <section className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
            <p className="font-title-md">{data.name}</p>
            <p className="text-sm text-on-surface-variant">Loại: {data.orgType}</p>
            <p className="text-sm">Thành viên: {data.memberCount}</p>
            <p className="text-sm">Hoàn thành nhiệm vụ: {data.completionRatePct}%</p>
            <p className="text-sm">Full tour Củ Chi: {data.fullTourRatePct}%</p>
            <p className="text-xs text-on-surface-variant mt-2">{data.note}</p>
          </section>
        )}

        {orgId && (
          <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-md border-b border-outline-variant">
              <h2 className="font-title-md">Danh sách thành viên</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-high text-on-surface-variant">
                  <tr>
                    <th className="text-left p-sm">Thành viên</th>
                    <th className="text-left p-sm">Vai trò</th>
                    <th className="text-left p-sm">Cấp</th>
                    <th className="text-left p-sm">XP</th>
                    <th className="text-left p-sm">Nhiệm vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((m) => (
                    <tr key={m.userId} className="border-t border-outline-variant/40">
                      <td className="p-sm">
                        <p>{m.displayName}</p>
                        <p className="text-xs text-on-surface-variant">{m.email}</p>
                      </td>
                      <td className="p-sm">{m.orgRole}</td>
                      <td className="p-sm">{m.level}</td>
                      <td className="p-sm">{m.totalPoints}</td>
                      <td className="p-sm">{m.questsCompleted}</td>
                    </tr>
                  ))}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-md text-center text-on-surface-variant">
                        Không có thành viên.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </AppLayout>
  )
}
