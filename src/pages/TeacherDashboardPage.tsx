import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { orgApi, type OrgMembership, type OrgRosterMember } from '../features/org/api'
import type { OrganizationAnalytics } from '../features/admin/api'
import { useToast } from '../shared/ui/toast/useToast'

export function TeacherDashboardPage() {
  const [memberships, setMemberships] = useState<OrgMembership[]>([])
  const [orgId, setOrgId] = useState('')
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null)
  const [roster, setRoster] = useState<OrgRosterMember[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    orgApi
      .mine()
      .then((items) => {
        setMemberships(items)
        if (items[0]) setOrgId(items[0].organizationId)
      })
      .catch(() => showToast({ message: 'Không tải được tổ chức.', type: 'error' }))
  }, [showToast])

  useEffect(() => {
    if (!orgId) return
    orgApi.analytics(orgId).then(setAnalytics).catch(() => setAnalytics(null))
    orgApi.roster(orgId).then(setRoster).catch(() => setRoster([]))
  }, [orgId])

  const students = roster.filter((m) => m.orgRole !== 'teacher')

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Bảng giáo viên" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        <div className="flex flex-wrap items-center gap-sm">
          <h1 className="font-display-md text-on-surface flex-1">Dashboard lớp học</h1>
          <Link to="/profile" className="text-sm text-secondary underline">
            Hồ sơ
          </Link>
        </div>

        {memberships.length > 1 && (
          <label className="flex items-center gap-sm text-sm">
            Tổ chức
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-full px-md py-xs"
            >
              {memberships.map((m) => (
                <option key={m.organizationId} value={m.organizationId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {analytics && (
          <section className="grid md:grid-cols-3 gap-sm">
            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
              <p className="text-xs text-on-surface-variant uppercase">Thành viên</p>
              <p className="text-2xl font-bold">{analytics.memberCount}</p>
            </div>
            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
              <p className="text-xs text-on-surface-variant uppercase">Hoàn thành quest</p>
              <p className="text-2xl font-bold">{analytics.completionRatePct}%</p>
            </div>
            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
              <p className="text-xs text-on-surface-variant uppercase">Full tour Củ Chi</p>
              <p className="text-2xl font-bold">{analytics.fullTourRatePct}%</p>
            </div>
          </section>
        )}

        <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-md border-b border-outline-variant">
            <h2 className="font-title-md">Danh sách học sinh</h2>
            <p className="text-sm text-on-surface-variant">{students.length} học sinh</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-high text-on-surface-variant">
                <tr>
                  <th className="text-left p-sm">Học sinh</th>
                  <th className="text-left p-sm">Level</th>
                  <th className="text-left p-sm">XP</th>
                  <th className="text-left p-sm">Quest hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.userId} className="border-t border-outline-variant/40">
                    <td className="p-sm">
                      <p className="font-medium">{s.displayName}</p>
                      <p className="text-xs text-on-surface-variant">{s.email}</p>
                    </td>
                    <td className="p-sm">{s.level}</td>
                    <td className="p-sm">{s.totalPoints}</td>
                    <td className="p-sm">{s.questsCompleted}</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-md text-on-surface-variant text-center">
                      Chưa có học sinh trong tổ chức.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppLayout>
  )
}
