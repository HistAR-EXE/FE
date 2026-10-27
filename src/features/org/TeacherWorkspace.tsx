import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'
import { useCcuHeartbeat } from '../../shared/hooks/useCcuHeartbeat'
import { CcuLimitModal } from '../../components/monetization/CcuLimitModal'
import { orgApi, type OrgBillingStatus, type OrgCapabilities, type OrgMembership } from './api'
import { isTeachingMembership, teacherRouteCapability } from './teacherWorkspaceState'
import './teacher-workspace.css'
import { TeacherWorkspaceContext } from './teacher-workspace-context'

const navigation: Array<{ to: string; label: string; icon: string; capability?: keyof OrgCapabilities }> = [
  { to: '/teacher', label: 'Tổng quan & học sinh', icon: 'dashboard' },
  { to: '/teacher/assignments', label: 'Bài tập', icon: 'assignment', capability: 'assignments' },
  { to: '/teacher/live-board', label: 'Live Board & báo cáo', icon: 'monitoring', capability: 'liveBoard' },
  { to: '/teacher/trips', label: 'Chuyến tham quan', icon: 'explore', capability: 'fieldTrips' },
  { to: '/groups', label: 'Hoạt động nhóm', icon: 'groups', capability: 'groups' },
]

export function TeacherWorkspaceLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const { ccuLimitOpen, dismissCcuLimit } = useCcuHeartbeat()
  const [memberships, setMemberships] = useState<OrgMembership[]>([])
  const [orgId, setOrgId] = useState('')
  const [capabilities, setCapabilities] = useState<OrgCapabilities | null>(null)
  const [billing, setBilling] = useState<OrgBillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const reload = () => setRevision(value => value + 1)

  useEffect(() => {
    const onFocus = () => setRevision(value => value + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    let cancelled = false
    orgApi.mine().then(items => {
      if (cancelled) return
      setError('')
      const teachers = items.filter(item => isTeachingMembership(item.orgRole))
      setMemberships(teachers)
      setOrgId(current => teachers.some(item => item.organizationId === current) ? current : teachers[0]?.organizationId ?? '')
      if (teachers.length === 0) setLoading(false)
    }).catch(() => { if (!cancelled) { setError('Chưa tải được tổ chức. Vui lòng thử lại.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [revision])

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setLoading(true)
    setError('')
    setCapabilities(null)
    setBilling(null)
    orgApi.capabilities(orgId).then(async nextCapabilities => {
      const nextBilling = nextCapabilities.organizationActive ? await orgApi.dashboardStats(orgId) : null
      return [nextCapabilities, nextBilling] as const
    }).then(([nextCapabilities, nextBilling]) => {
      if (!cancelled) { setCapabilities(nextCapabilities); setBilling(nextBilling) }
    }).catch(() => { if (!cancelled) setError('Chưa tải được quyền và hạn mức. Dữ liệu chưa sẵn sàng, vui lòng thử lại.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orgId, revision])

  const required = teacherRouteCapability(pathname)
  const locked = required && !capabilities?.[required]
  const content = loading && (!capabilities || billing?.organizationId !== orgId) ? <WorkspaceMessage title="Đang chuẩn bị lớp học…">Đang kiểm tra quyền và hạn mức tổ chức.</WorkspaceMessage>
    : error ? <WorkspaceMessage title="Chưa kết nối được lớp học"><p role="alert">{error}</p><button onClick={reload}>Thử lại</button></WorkspaceMessage>
      : !orgId ? <WorkspaceMessage title="Bạn chưa có tổ chức để quản lý">Liên hệ quản lý B2B để được cấp quyền giáo viên. <Link to="/pricing">Xem các gói tổ chức</Link></WorkspaceMessage>
        : !capabilities?.organizationActive ? <WorkspaceMessage title="Gói tổ chức chưa hoạt động">Quyền Premium theo tổ chức và các nghiệp vụ lớp học đang tạm dừng. Vui lòng liên hệ quản lý tổ chức.</WorkspaceMessage>
          : locked ? <WorkspaceMessage title="Tính năng chưa có trong gói hiện tại">{required === 'fieldTrips' ? 'Chuyến tham quan dành cho gói Premium.' : 'Bài tập, Live Board và report snapshot dành cho Standard/Premium.'} <Link to="/pricing">Xem quyền theo gói</Link></WorkspaceMessage>
            : <Outlet key={orgId} />

  return <TeacherWorkspaceContext.Provider value={{ orgId, setOrgId, memberships, capabilities, billing, reload }}>
    <div className="teacher-workspace">
      <aside className="tw-sidebar">
        <Link className="tw-brand" to="/teacher"><span className="tw-brand-mark">T</span><span>TimeLens<small>KHÔNG GIAN GIÁO VIÊN</small></span></Link>
        <div className="tw-sidebar-label">LỚP HỌC CỦA BẠN</div>
        <nav aria-label="Điều hướng giáo viên">{navigation.map(item => {
          const enabled = !item.capability || capabilities?.[item.capability]
          return <NavLink end={item.to === '/teacher'} key={item.to} to={item.to} onClick={event => { if (!enabled && item.to === '/groups') event.preventDefault() }} aria-disabled={!enabled} title={!enabled ? 'Tính năng cần gói phù hợp. Xem quyền trong Tổng quan.' : undefined} className={({ isActive }) => `${isActive ? 'is-active' : ''} ${!enabled ? 'is-locked' : ''}`}>
            <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>{item.label}{!enabled && <span className="material-symbols-outlined tw-lock" aria-label="Cần nâng gói">lock</span>}
          </NavLink>
        })}</nav>
        <div className="tw-plan-note"><span className="material-symbols-outlined" aria-hidden="true">verified</span><strong>Premium theo tổ chức</strong><p>Quyền trải nghiệm đi cùng thời hạn gói. AI và người dùng đồng thời tuân theo hạn mức tổ chức.</p><Link to="/pricing">So sánh các gói ↗</Link></div>
        <Link className="tw-back" to="/home">← Trở về ứng dụng</Link>
      </aside>
      <div className="tw-body">
        <header className="tw-topbar"><div><span className="tw-kicker">NHÀ TRƯỜNG & TỔ CHỨC</span><strong>Học cùng nhau. Khám phá cùng nhau.</strong></div><div className="tw-user"><span className="tw-avatar">{user?.displayName.slice(0, 1) || 'G'}</span><span>{user?.displayName}<small>{capabilities?.manageTeachers ? 'Quản lý tổ chức' : 'Giáo viên'}</small></span><button onClick={logout} aria-label="Đăng xuất"><span className="material-symbols-outlined">logout</span></button></div></header>
        <div className="tw-orgbar"><div><span className="tw-status-dot" /><span>{billing?.orgName || 'Tổ chức của bạn'}</span><span className="tw-plan-badge">{billing?.planType || 'B2B'}</span></div>{memberships.length > 1 && <label>Tổ chức <select aria-label="Tổ chức đang quản lý" value={orgId} onChange={event => setOrgId(event.target.value)}>{memberships.map(item => <option key={item.organizationId} value={item.organizationId}>{item.name}</option>)}</select></label>}</div>
        <div className="tw-content">{content}</div>
        <footer className="tw-footer">TimeLens · Đồng hành cùng mỗi hành trình học tập</footer>
      </div>
      <CcuLimitModal open={ccuLimitOpen} onClose={dismissCcuLimit} />
    </div>
  </TeacherWorkspaceContext.Provider>
}

function WorkspaceMessage({ title, children }: { title: string; children: ReactNode }) {
  return <section className="tw-state"><span className="material-symbols-outlined" aria-hidden="true">school</span><h1>{title}</h1><div>{children}</div></section>
}
