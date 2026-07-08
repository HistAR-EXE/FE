import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { orgApi, type OrgBillingStatus, type OrgInviteCode, type OrgMembership, type OrgRosterMember } from '../features/org/api'
import type { OrganizationAnalytics } from '../features/admin/api'
import { useToast } from '../shared/ui/toast/useToast'

export function TeacherDashboardPage() {
  const [memberships, setMemberships] = useState<OrgMembership[]>([])
  const [orgId, setOrgId] = useState('')
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null)
  const [roster, setRoster] = useState<OrgRosterMember[]>([])
  const [invite, setInvite] = useState<OrgInviteCode | null>(null)
  const [dashboardStats, setDashboardStats] = useState<OrgBillingStatus | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStudentName, setInviteStudentName] = useState('')
  const [sendingInviteEmail, setSendingInviteEmail] = useState(false)
  const [provisionEmail, setProvisionEmail] = useState('')
  const [provisionName, setProvisionName] = useState('')
  const [provisioning, setProvisioning] = useState(false)
  const [provisionResult, setProvisionResult] = useState<string | null>(null)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
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
    orgApi.getInviteCode(orgId).then(setInvite).catch(() => setInvite(null))
    orgApi.dashboardStats(orgId).then(setDashboardStats).catch(() => setDashboardStats(null))
  }, [orgId])

  const regenerateInvite = async () => {
    if (!orgId) return
    try {
      setInviteLoading(true)
      const next = await orgApi.generateInviteCode(orgId)
      setInvite(next)
      showToast({ message: 'Đã tạo mã mời mới', type: 'success' })
    } catch {
      showToast({ message: 'Không tạo được mã mời', type: 'error' })
    } finally {
      setInviteLoading(false)
    }
  }

  const copyInvite = async () => {
    const text = invite?.inviteUrl ?? invite?.inviteCode
    if (!text) return
    try {
      const fullUrl =
        invite?.inviteUrl?.startsWith('http')
          ? invite.inviteUrl
          : `${window.location.origin}${invite?.inviteUrl ?? `/join?code=${invite?.inviteCode}`}`
      await navigator.clipboard.writeText(fullUrl)
      showToast({ message: 'Đã copy link mời', type: 'success' })
    } catch {
      showToast({ message: text, type: 'info' })
    }
  }

  const sendInviteEmail = async () => {
    if (!orgId || !inviteEmail.trim()) return
    try {
      setSendingInviteEmail(true)
      await orgApi.sendInviteEmail(orgId, {
        studentEmail: inviteEmail.trim(),
        studentName: inviteStudentName.trim() || undefined,
      })
      showToast({ message: `Đã gửi email mời tới ${inviteEmail.trim()}`, type: 'success' })
      setInviteEmail('')
      setInviteStudentName('')
      const next = await orgApi.getInviteCode(orgId)
      setInvite(next)
    } catch {
      showToast({ message: 'Không gửi được email mời. Kiểm tra SMTP hoặc thử lại.', type: 'error' })
    } finally {
      setSendingInviteEmail(false)
    }
  }

  const provisionStudent = async () => {
    if (!orgId || !provisionEmail.trim()) return
    try {
      setProvisioning(true)
      setProvisionResult(null)
      const result = await orgApi.provisionStudent(orgId, {
        email: provisionEmail.trim(),
        displayName: provisionName.trim() || undefined,
        sendCredentialsEmail: false,
      })
      const msg = result.accountCreated
        ? result.temporaryPassword
          ? `Đã tạo tài khoản. Mật khẩu tạm: ${result.temporaryPassword}`
          : 'Đã tạo tài khoản và gửi email thông tin đăng nhập.'
        : 'Học sinh đã có tài khoản — đã thêm vào lớp.'
      setProvisionResult(msg)
      showToast({ message: 'Đã cấp tài khoản học sinh', type: 'success' })
      setProvisionEmail('')
      setProvisionName('')
      const [nextRoster, nextStats] = await Promise.all([
        orgApi.roster(orgId),
        orgApi.dashboardStats(orgId),
      ])
      setRoster(nextRoster)
      setDashboardStats(nextStats)
    } catch {
      showToast({ message: 'Không tạo được tài khoản học sinh', type: 'error' })
    } finally {
      setProvisioning(false)
    }
  }

  const students = roster.filter((m) => m.orgRole !== 'teacher')

  const removeMember = async (userId: string) => {
    if (!window.confirm('Xoá học sinh này khỏi tổ chức?')) return
    try {
      setRemovingUserId(userId)
      await orgApi.removeMember(userId)
      setRoster((prev) => prev.filter((member) => member.userId !== userId))
      setDashboardStats((prev) =>
        prev
          ? {
              ...prev,
              verifiedAccounts: Math.max(0, prev.verifiedAccounts - 1),
            }
          : prev,
      )
      showToast({ message: 'Đã xoá học sinh khỏi tổ chức', type: 'success' })
    } catch {
      showToast({ message: 'Không thể xoá học sinh', type: 'error' })
    } finally {
      setRemovingUserId(null)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Bảng giáo viên (MVP)" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        <div className="flex flex-wrap items-center gap-sm">
          <div className="flex-1 min-w-0">
            <h1 className="font-display-md text-on-surface">Dashboard lớp học</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Theo dõi lớp học — bản demo B2B; vận hành trường có Account Manager riêng.
            </p>
          </div>
          <Link to="/groups" className="text-sm px-sm py-xs border border-outline-variant rounded-lg hover:border-secondary">
            Team-based Quest Room
          </Link>
          {dashboardStats?.planType === 'PREMIUM' && (
            <Link to="/teacher/assignments" className="text-sm px-sm py-xs border border-secondary/40 rounded-lg text-secondary">
              LMS Premium
            </Link>
          )}
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

        {orgId && (
          <section className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
            <h2 className="font-title-md">Mã mời tổ chức</h2>
            <p className="text-sm text-on-surface-variant">
              Học sinh nhập mã này tại Cài đặt → Lớp học để gia nhập lớp.
            </p>
            {invite?.inviteCode ? (
              <div className="flex flex-wrap items-center gap-sm">
                <code className="text-lg font-mono tracking-widest text-secondary bg-surface-container-high px-md py-xs rounded-lg border border-outline-variant">
                  {invite.inviteCode}
                </code>
                {invite.inviteUrl && (
                  <span className="text-xs text-on-surface-variant">{invite.inviteUrl}</span>
                )}
                {invite.expiresAt && (
                  <span className="text-xs text-on-surface-variant w-full">
                    Hết hạn: {new Date(invite.expiresAt).toLocaleString('vi-VN')} (7 ngày)
                  </span>
                )}
                <button type="button" onClick={() => void copyInvite()} className="text-sm text-secondary underline">
                  Copy
                </button>
                <button
                  type="button"
                  disabled={inviteLoading}
                  onClick={() => void regenerateInvite()}
                  className="text-sm px-sm py-xs border border-outline-variant rounded-lg"
                >
                  {inviteLoading ? 'Đang tạo...' : 'Tạo mã mới'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={inviteLoading}
                onClick={() => void regenerateInvite()}
                className="text-sm px-md py-sm border border-secondary text-secondary rounded-lg"
              >
                Tạo mã mời
              </button>
            )}
            <div className="border-t border-outline-variant pt-md space-y-sm">
              <h3 className="font-medium text-sm">Gửi lời mời qua email</h3>
              <p className="text-xs text-on-surface-variant">
                Học sinh nhận email có link deep-link (đăng ký → tham gia lớp tự động).
              </p>
              <label className="block text-sm space-y-1">
                Email học sinh
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                  placeholder="hocsinh@truong.edu.vn"
                />
              </label>
              <label className="block text-sm space-y-1">
                Tên học sinh (tuỳ chọn)
                <input
                  value={inviteStudentName}
                  onChange={(e) => setInviteStudentName(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                  placeholder="Nguyễn Văn A"
                />
              </label>
              {invite?.inviteUrl && (
                <p className="text-xs text-on-surface-variant break-all">
                  Link preview: {invite.inviteUrl.startsWith('http') ? invite.inviteUrl : `${window.location.origin}${invite.inviteUrl}`}
                </p>
              )}
              <button
                type="button"
                disabled={sendingInviteEmail || !inviteEmail.trim()}
                onClick={() => void sendInviteEmail()}
                className="text-sm px-md py-sm bg-secondary text-on-secondary rounded-lg disabled:opacity-60"
              >
                {sendingInviteEmail ? 'Đang gửi...' : 'Gửi email mời'}
              </button>
            </div>
            <div className="border-t border-outline-variant pt-md space-y-sm">
              <h3 className="font-medium text-sm">Tạo tài khoản học sinh (Sub-account)</h3>
              <p className="text-xs text-on-surface-variant">
                Giáo viên tạo account hộ học sinh — học sinh đăng nhập bằng email và mật khẩu tạm (đổi tại Cài đặt).
              </p>
              <label className="block text-sm space-y-1">
                Email học sinh
                <input
                  type="email"
                  value={provisionEmail}
                  onChange={(e) => setProvisionEmail(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                  placeholder="hocsinh@truong.edu.vn"
                />
              </label>
              <label className="block text-sm space-y-1">
                Tên hiển thị (tuỳ chọn)
                <input
                  value={provisionName}
                  onChange={(e) => setProvisionName(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                  placeholder="Nguyễn Văn A"
                />
              </label>
              {provisionResult && (
                <p className="text-xs text-secondary bg-surface-container-high rounded-lg p-sm break-all">{provisionResult}</p>
              )}
              <button
                type="button"
                disabled={provisioning || !provisionEmail.trim() || dashboardStats?.accountLimitReached}
                onClick={() => void provisionStudent()}
                className="text-sm px-md py-sm border border-secondary text-secondary rounded-lg disabled:opacity-60"
              >
                {provisioning ? 'Đang tạo...' : 'Tạo tài khoản học sinh'}
              </button>
            </div>
          </section>
        )}

        {dashboardStats && (
          <>
            {dashboardStats.aiQueriesLimit != null &&
              dashboardStats.aiQueriesUsed >= dashboardStats.aiQueriesLimit && (
                <div className="rounded-xl border border-error/50 bg-error/10 p-md text-sm text-error">
                  Đã dùng hết AI Pool tháng này ({dashboardStats.aiQueriesUsed}/{dashboardStats.aiQueriesLimit}). Cân nhắc
                  nâng gói để học sinh tiếp tục chat AI.
                </div>
              )}
          <section className="grid md:grid-cols-4 gap-sm">
            <div className={`bg-surface-container border rounded-xl p-md ${dashboardStats.accountLimitReached ? 'border-error/50' : 'border-outline-variant'}`}>
              <p className="text-xs text-on-surface-variant uppercase">Tài khoản đã cấp</p>
              <p className="text-2xl font-bold">
                {dashboardStats.verifiedAccounts}/{dashboardStats.maxVerifiedAccounts}
              </p>
              {dashboardStats.accountLimitReached && <p className="text-xs text-error mt-1">Đã chạm giới hạn tài khoản</p>}
            </div>
            <div className={`bg-surface-container border rounded-xl p-md ${dashboardStats.ccuLimitReached ? 'border-error/50' : 'border-outline-variant'}`}>
              <p className="text-xs text-on-surface-variant uppercase">CCU (demo)</p>
              <p className="text-2xl font-bold">
                {dashboardStats.ccuCurrent}/{dashboardStats.maxCcu}
              </p>
              {dashboardStats.ccuLimitReached && <p className="text-xs text-error mt-1">Đang đầy CCU của gói</p>}
            </div>
            <div className="bg-surface-container border border-outline-variant rounded-xl p-md">
              <p className="text-xs text-on-surface-variant uppercase">AI queries tháng</p>
              <p className="text-2xl font-bold">
                {dashboardStats.aiQueriesUsed}/
                {dashboardStats.aiQueriesLimit ?? '∞'}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Reset: {dashboardStats.quotaResetsOn ?? 'Không giới hạn'}
              </p>
            </div>
            <div className={`bg-surface-container border rounded-xl p-md ${!dashboardStats.isActive || (dashboardStats.daysUntilExpiry >= 0 && dashboardStats.daysUntilExpiry <= 30) ? 'border-secondary/50' : 'border-outline-variant'}`}>
              <p className="text-xs text-on-surface-variant uppercase">Trạng thái gói</p>
              <p className="text-2xl font-bold">{dashboardStats.isActive ? dashboardStats.planType : 'EXPIRED'}</p>
              {dashboardStats.planType === 'STANDARD' && dashboardStats.daysUntilExpiry >= 0 && dashboardStats.daysUntilExpiry <= 14 && (
                <p className="text-xs text-primary mt-1">Classroom Trial · còn {dashboardStats.daysUntilExpiry} ngày</p>
              )}
              <p className="text-xs text-on-surface-variant mt-1">
                {dashboardStats.daysUntilExpiry < 0
                  ? 'Không giới hạn thời hạn'
                  : dashboardStats.isActive
                    ? `Còn ${dashboardStats.daysUntilExpiry} ngày`
                    : 'Đã hết hạn'}
              </p>
            </div>
          </section>
          </>
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
                  <th className="text-left p-sm">Tiến độ quest</th>
                  <th className="text-left p-sm">Thao tác</th>
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
                    <td className="p-sm min-w-[140px]">
                      {(s.questProgress ?? []).length === 0 ? (
                        <span className="text-on-surface-variant">—</span>
                      ) : (
                        <div className="space-y-1">
                          {s.questProgress!.slice(0, 3).map((q) => (
                            <div key={q.questId} className="text-xs">
                              <div className="flex justify-between gap-1 mb-0.5">
                                <span className="truncate max-w-[100px]" title={q.title}>
                                  {q.title}
                                </span>
                                <span>{q.completionPct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                                <div
                                  className="h-full bg-secondary rounded-full"
                                  style={{ width: `${q.completionPct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-sm">
                      <button
                        type="button"
                        disabled={removingUserId === s.userId}
                        onClick={() => void removeMember(s.userId)}
                        className="text-error underline disabled:opacity-60"
                      >
                        {removingUserId === s.userId ? 'Đang xoá...' : 'Xoá'}
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-md text-on-surface-variant text-center">
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
