import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminApi } from '../../features/admin/api'
import { ADMIN_TRASH_CHANGED_EVENT } from '../../features/admin/events'
import { SESSION_CLEARED_EVENT, SESSION_REFRESHED_EVENT } from '../../shared/auth/session'
import { getAccessTokenExpiryState } from '../../shared/auth/sessionTiming'
import { useAuth } from '../../shared/auth/useAuth'
import { useUserAvatar } from '../../shared/auth/useUserAvatar'
import { MaterialIcon } from '../ui/MaterialIcon'
import { UserAvatarDropdown } from '../layout/TopNav'

const pageMeta: Record<string, string> = {
  '/admin': 'Bàn điều hành',
  '/admin/content': 'Nội dung',
  '/admin/narrative-pilots': 'Pilot cốt truyện',
  '/admin/trash': 'Thùng rác',
  '/admin/users': 'Người dùng',
  '/admin/organizations': 'Tổ chức',
  '/admin/billing': 'Thanh toán & CRM',
  '/admin/analytics': 'Phân tích',
  '/admin/audit': 'Nhật ký kiểm toán',
}

const groups = [
  { label: 'Tổng quan', links: [['Bàn điều hành', '/admin', 'dashboard']] as const },
  {
    label: 'Vận hành',
    links: [
      ['Nội dung', '/admin/content', 'article'],
      ['Pilot cốt truyện', '/admin/narrative-pilots', 'auto_stories'],
      ['Thùng rác', '/admin/trash', 'delete'],
    ] as const,
  },
  {
    label: 'Khách hàng & doanh thu',
    links: [
      ['Người dùng', '/admin/users', 'group'],
      ['Tổ chức', '/admin/organizations', 'apartment'],
      ['Thanh toán & CRM', '/admin/billing', 'credit_card'],
    ] as const,
    accent: true,
  },
  {
    label: 'Giám sát',
    links: [
      ['Analytics', '/admin/analytics', 'query_stats'],
      ['Nhật ký kiểm toán', '/admin/audit', 'security_update_good'],
    ] as const,
  },
] as const

const quickNav = [
  { to: '/admin', title: 'Bàn điều hành', icon: 'dashboard', sub: 'KPI doanh thu & hàng đợi vận hành' },
  { to: '/admin/content', title: 'Nội dung', icon: 'article', sub: 'POI, hiện vật, nhiệm vụ, panorama' },
  { to: '/admin/narrative-pilots', title: 'Pilot cốt truyện', icon: 'auto_stories', sub: 'Soạn, duyệt và phát hành quest' },
  { to: '/admin/trash', title: 'Thùng rác', icon: 'delete', sub: 'Khôi phục nội dung đã xóa mềm' },
  { to: '/admin/users', title: 'Người dùng', icon: 'group', sub: 'Tài khoản và phân quyền' },
  { to: '/admin/organizations', title: 'Tổ chức', icon: 'apartment', sub: 'Roster và phân tích tổ chức' },
  { to: '/admin/billing', title: 'Thanh toán & CRM', icon: 'credit_card', sub: 'Doanh thu, thanh toán, inquiry' },
  { to: '/admin/analytics', title: 'Phân tích', icon: 'query_stats', sub: 'Phễu quest & chất lượng phiên' },
  { to: '/admin/audit', title: 'Nhật ký kiểm toán', icon: 'security_update_good', sub: 'Tra cứu thay đổi quản trị' },
] as const

export function AdminConsoleLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const avatarSrc = useUserAvatar()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const [trashCount, setTrashCount] = useState<number | null>(null)
  const [expiry, setExpiry] = useState(() => getAccessTokenExpiryState(localStorage))
  const drawerRef = useRef<HTMLElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const routeKey = Object.keys(pageMeta)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || (path !== '/admin' && pathname.startsWith(`${path}/`))) ?? '/admin'
  const title = pageMeta[routeKey]
  const isCustomerRevenue = pathname.startsWith('/admin/users')
    || pathname.startsWith('/admin/organizations')
    || pathname.startsWith('/admin/billing')

  const filteredNav = useMemo(() => {
    const q = quickSearch.trim().toLowerCase()
    if (!q) return quickNav
    return quickNav.filter((item) => item.title.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q) || item.to.includes(q))
  }, [quickSearch])

  const refreshTrashCount = useCallback(() => {
    let active = true
    adminApi.dashboardSummary()
      .then((summary) => { if (active) setTrashCount(summary.trashCount) })
      .catch(() => { if (active) setTrashCount(null) })
    return () => { active = false }
  }, [])

  useEffect(() => refreshTrashCount(), [pathname, refreshTrashCount])
  useEffect(() => {
    const refresh = () => { refreshTrashCount() }
    window.addEventListener(ADMIN_TRASH_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(ADMIN_TRASH_CHANGED_EVENT, refresh)
  }, [refreshTrashCount])

  useEffect(() => {
    const update = () => setExpiry(getAccessTokenExpiryState(localStorage))
    const timer = window.setInterval(update, 60_000)
    window.addEventListener(SESSION_REFRESHED_EVENT, update)
    window.addEventListener(SESSION_CLEARED_EVENT, update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener(SESSION_REFRESHED_EVENT, update)
      window.removeEventListener(SESSION_CLEARED_EVENT, update)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCmdOpen((open) => !open)
        setQuickOpen(false)
      } else if (event.key === 'Escape') {
        setCmdOpen(false)
        setQuickOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeDrawer = useCallback(() => setMobileOpen(false), [])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeAtDesktop = (event: MediaQueryListEvent | MediaQueryList) => { if (event.matches) closeDrawer() }
    closeAtDesktop(desktop)
    desktop.addEventListener('change', closeAtDesktop)
    return () => desktop.removeEventListener('change', closeAtDesktop)
  }, [closeDrawer])

  useEffect(() => {
    if (!mobileOpen) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const shell = shellRef.current
    const drawer = drawerRef.current
    const focusable = () => Array.from(drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
    shell?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    focusable()[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      shell?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [closeDrawer, mobileOpen])

  const go = (to: string) => {
    setCmdOpen(false)
    setQuickOpen(false)
    setQuickSearch('')
    closeDrawer()
    navigate(to)
  }

  const navigation = (
    <nav aria-label="Điều hướng Admin Console" className="space-y-space-md">
      {groups.map((group) => {
        const accent = 'accent' in group && group.accent && isCustomerRevenue
        return (
          <section
            key={group.label}
            className={accent ? 'space-y-space-xs rounded-xl bg-surface-container-low/70 p-1.5 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)]' : 'space-y-space-xs'}
          >
            <p className={`px-space-md py-1 font-label-sm text-label-sm uppercase tracking-wider ${accent ? 'font-semibold text-primary' : 'text-outline'}`}>
              {group.label}
              {accent && <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
            </p>
            <div className="space-y-0.5">
              {group.links.map(([label, to, icon]) => {
                const active = pathname === to || (to !== '/admin' && pathname.startsWith(`${to}/`))
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={closeDrawer}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-space-sm rounded-lg px-space-md py-2 text-body-md transition-all ${
                      active
                        ? 'ops-nav-active font-headline-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <MaterialIcon name={icon} className="text-[18px]" />
                    <span className="flex-1 font-body-md">{label}</span>
                    {to === '/admin/trash' && trashCount !== null && (
                      <span aria-label={`${trashCount} mục trong thùng rác`} className="rounded-full bg-surface-container-highest px-2 py-0.5 font-code-sm text-code-sm tabular-nums text-on-surface-variant">
                        {trashCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </nav>
  )

  return (
    <div
      className="admin-console min-h-screen max-w-[100vw] overflow-x-clip bg-surface font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container"
      style={{ '--admin-header-height': expiry.expiringSoon ? '7rem' : '3.5rem' } as CSSProperties}
    >
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.4)] md:flex">
        <div className="flex h-14 items-center justify-between bg-surface-container-low px-space-lg">
          <Link to="/admin" aria-label="Admin Console" className="flex items-center gap-space-sm">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(16,185,129,0.35)]">
              <MaterialIcon name="bolt" className="text-[18px]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-headline-sm text-headline-sm uppercase tracking-tight text-on-surface">HistAR</span>
              <span className="mt-0.5 font-code-sm text-code-sm tracking-widest text-primary">ADMIN</span>
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-space-sm py-space-md">{navigation}</div>
        <div className="bg-surface-container-low p-space-md">
          <div className="flex items-center gap-space-sm rounded-lg bg-surface-container px-space-md py-space-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <div className="min-w-0 flex-col">
              <p className="truncate font-label-sm text-label-sm font-semibold text-on-surface">Hệ thống sẵn sàng</p>
              <p className="truncate font-code-sm text-code-sm text-outline">HistAR Admin Core</p>
            </div>
          </div>
        </div>
      </aside>

      <div ref={shellRef} className="min-w-0 md:pl-64">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 min-w-0 items-center justify-between gap-space-md bg-surface-container-lowest/80 px-gutter-desktop shadow-[0_1px_8px_rgba(0,0,0,0.3)] backdrop-blur-xl md:left-64">
          <div className={`flex min-w-0 flex-1 items-center gap-space-lg ${isCustomerRevenue ? 'max-w-2xl' : 'max-w-xl'}`}>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container md:hidden"
              aria-label="Mở menu quản trị"
              aria-expanded={mobileOpen}
            >
              <MaterialIcon name="menu" />
            </button>
            {/* Stitch: breadcrumb only in Khách hàng & Doanh thu; keep aria for tests */}
            <nav
              aria-label="Đường dẫn điều hướng"
              className={`hidden shrink-0 items-center gap-1.5 font-label-sm text-label-sm text-outline lg:flex ${isCustomerRevenue ? '' : 'sr-only'}`}
            >
              <Link to="/admin" className="hover:text-on-surface">Quản trị</Link>
              <MaterialIcon name="chevron_right" className="text-[14px]" />
              <span className="font-medium text-primary">
                {isCustomerRevenue ? 'Khách hàng & Doanh thu' : title}
              </span>
            </nav>
            <div className="relative w-full min-w-0">
              <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline" />
              <input
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
                onFocus={() => setCmdOpen(true)}
                className="w-full rounded-lg bg-surface-container-low py-1.5 pl-9 pr-12 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Tìm kiếm nhanh (Cmd + K)..."
                type="search"
                aria-label="Tìm kiếm nhanh trong admin"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-surface-container-high px-1.5 py-0.5 font-code-sm text-code-sm text-outline">⌘K</kbd>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-space-sm sm:gap-space-md">
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="ops-btn-primary hidden sm:inline-flex"
            >
              <MaterialIcon name="add" className="text-[16px]" />
              <span>Thao tác nhanh</span>
            </button>
            <div className="hidden h-5 w-px bg-surface-container-high sm:block" />
            <Link
              to="/admin/audit"
              className="relative rounded-lg p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              aria-label="Nhật ký kiểm toán"
              title="Nhật ký kiểm toán"
            >
              <MaterialIcon name="notifications" className="text-[20px]" />
              {trashCount !== null && trashCount > 0 && (
                <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary-container px-1 font-label-sm text-[10px] font-bold text-on-primary-container">
                  {trashCount > 9 ? '9+' : trashCount}
                </span>
              )}
            </Link>
            <Link
              to="/home"
              className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              aria-label="Về ứng dụng"
              title="Về ứng dụng"
            >
              <MaterialIcon name="home" className="text-[20px]" />
            </Link>
            <div className="flex items-center gap-2.5 pl-1">
              <UserAvatarDropdown avatarSrc={avatarSrc} hideAdminPortal />
              <div className="hidden flex-col text-left md:flex">
                <span className="font-headline-sm text-headline-sm leading-tight text-on-surface">
                  {user?.displayName ?? 'Quản trị viên'}
                </span>
                <span className="font-body-sm text-body-sm leading-tight text-outline">Quản trị viên</span>
              </div>
            </div>
          </div>
        </header>

        {expiry.expiringSoon && expiry.expiresAt !== null && (
          <p role="status" className="fixed left-0 right-0 top-14 z-30 border-b border-outline-variant bg-surface-container-low px-gutter-desktop py-2 font-label-sm text-label-sm font-semibold text-tertiary md:left-64">
            Phiên đăng nhập sắp hết hạn lúc {new Date(expiry.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.
          </p>
        )}

        <main className={`min-h-screen w-full min-w-0 max-w-full overflow-x-clip bg-surface px-gutter-desktop pb-16 ${expiry.expiringSoon ? 'pt-[6.5rem]' : 'pt-14'}`}>
          <Outlet />
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <button type="button" aria-label="Đóng menu quản trị" className="absolute inset-0 w-full bg-black/70" onClick={closeDrawer} />
          <aside ref={drawerRef} className="relative flex h-full w-72 flex-col bg-surface-container-lowest px-3 py-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="font-semibold uppercase tracking-tight text-on-surface">HistAR Admin</span>
              <button type="button" onClick={closeDrawer} aria-label="Đóng menu" className="rounded p-2 text-on-surface-variant">
                <MaterialIcon name="close" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}

      {cmdOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/75 p-4 pt-24 backdrop-blur-sm" onClick={() => setCmdOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-low shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Điều hướng nhanh">
            <div className="flex items-center gap-2.5 border-b border-surface-container-high bg-surface-container-lowest p-3.5">
              <MaterialIcon name="search" className="text-[20px] text-primary" />
              <input
                autoFocus
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
                placeholder="Đi tới phân hệ admin..."
                className="w-full bg-transparent font-body-md text-body-md text-on-surface focus:outline-none"
              />
              <button type="button" onClick={() => setCmdOpen(false)} className="rounded bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm text-outline">ESC</button>
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto p-2">
              <div className="px-2.5 py-1 font-code-sm text-code-sm uppercase text-outline">Điều hướng nhanh</div>
              {filteredNav.map((item) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item.to)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-container-high"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-container text-primary">
                      <MaterialIcon name={item.icon} className="text-[18px]" />
                    </div>
                    <div>
                      <div className="font-headline-sm text-body-md text-on-surface">{item.title}</div>
                      <div className="font-code-sm text-code-sm text-outline">{item.sub}</div>
                    </div>
                  </div>
                  <MaterialIcon name="arrow_forward" className="text-[16px] text-outline" />
                </button>
              ))}
              {filteredNav.length === 0 && (
                <p className="px-3 py-4 font-body-sm text-body-sm text-outline">Không có phân hệ khớp từ khóa.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {quickOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setQuickOpen(false)}>
          <div className="w-full max-w-md space-y-space-md rounded-2xl border border-surface-container-high bg-surface-container-low p-space-lg shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Thao tác nhanh">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="bolt" className="text-[20px] text-primary" />
                <h2 className="font-headline-md text-headline-md text-on-surface">Thao tác nhanh</h2>
              </div>
              <button type="button" onClick={() => setQuickOpen(false)} className="rounded-lg p-1 text-outline hover:text-on-surface" aria-label="Đóng">
                <MaterialIcon name="close" className="text-[18px]" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { to: '/admin/content', icon: 'add_location_alt', title: 'Quản lý nội dung', sub: 'POI, hiện vật, nhiệm vụ' },
                { to: '/admin/narrative-pilots', icon: 'auto_stories', title: 'Pilot cốt truyện', sub: 'Soạn và duyệt quest' },
                { to: '/admin/billing', icon: 'receipt_long', title: 'Thanh toán & CRM', sub: 'Doanh thu và inquiry B2B' },
              ].map((item) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item.to)}
                  className="flex items-center gap-3 rounded-xl bg-surface-container p-3 text-left transition-all hover:bg-surface-container-high"
                >
                  <MaterialIcon name={item.icon} className="text-primary" />
                  <div>
                    <div className="font-headline-sm text-body-md text-on-surface">{item.title}</div>
                    <div className="font-code-sm text-code-sm text-outline">{item.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
