import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminApi } from '../../features/admin/api'
import { ADMIN_TRASH_CHANGED_EVENT } from '../../features/admin/events'
import { SESSION_CLEARED_EVENT, SESSION_REFRESHED_EVENT } from '../../shared/auth/session'
import { getAccessTokenExpiryState } from '../../shared/auth/sessionTiming'
import { useUserAvatar } from '../../shared/auth/useUserAvatar'
import { MaterialIcon } from '../ui/MaterialIcon'
import { AdminAccountMenu } from './AdminAccountMenu'
import { AdminModal } from './AdminModal'

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
      ['Phân tích', '/admin/analytics', 'query_stats'],
      ['Nhật ký kiểm toán', '/admin/audit', 'security_update_good'],
    ] as const,
  },
] as const

const quickNav = [
  { to: '/admin', title: 'Bàn điều hành', icon: 'dashboard', sub: 'Doanh thu và công việc cần xử lý' },
  { to: '/admin/content', title: 'Nội dung', icon: 'article', sub: 'Điểm khám phá, hiện vật và nhiệm vụ' },
  { to: '/admin/narrative-pilots', title: 'Pilot cốt truyện', icon: 'auto_stories', sub: 'Soạn, duyệt và phát hành cốt truyện' },
  { to: '/admin/trash', title: 'Thùng rác', icon: 'delete', sub: 'Khôi phục nội dung đã xóa' },
  { to: '/admin/users', title: 'Người dùng', icon: 'group', sub: 'Tài khoản và phân quyền' },
  { to: '/admin/organizations', title: 'Tổ chức', icon: 'apartment', sub: 'Thành viên và hoạt động tổ chức' },
  { to: '/admin/billing', title: 'Thanh toán & CRM', icon: 'credit_card', sub: 'Doanh thu, thanh toán và yêu cầu tư vấn' },
  { to: '/admin/analytics', title: 'Phân tích', icon: 'query_stats', sub: 'Tiến độ nhiệm vụ và chất lượng trải nghiệm' },
  { to: '/admin/audit', title: 'Nhật ký kiểm toán', icon: 'security_update_good', sub: 'Tra cứu thay đổi quản trị' },
] as const

export function AdminConsoleLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const avatarSrc = useUserAvatar()
  const searchShortcut = /Mac|iPhone|iPad/.test(window.navigator.userAgent) ? '⌘ K' : 'Ctrl K'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const [selectedResult, setSelectedResult] = useState<number>(0)
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
  const activeResult = Math.min(selectedResult, Math.max(0, filteredNav.length - 1))

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
            className={accent ? 'space-y-space-xs rounded-xl border border-outline-variant bg-surface-container-low/70 p-1.5' : 'space-y-space-xs'}
          >
            <p className={`px-space-md py-1 font-label-sm text-label-sm tracking-wide ${accent ? 'font-semibold text-primary' : 'text-outline'}`}>
              {group.label}
              {accent && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
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
      <aside className="admin-sidebar fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r border-outline-variant bg-surface-container-lowest md:flex">
        <div className="flex h-14 items-center justify-between border-b border-outline-variant bg-surface-container-low px-space-lg">
          <Link to="/admin" aria-label="Admin Console" className="flex items-center gap-space-sm">
            <img src="/brand/icon-192.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
            <div className="flex flex-col leading-none">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">TimeLens</span>
              <span className="mt-0.5 font-code-sm text-code-sm tracking-widest text-primary">ADMIN</span>
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-space-sm py-space-md">{navigation}</div>
        <div className="border-t border-outline-variant bg-surface-container-low p-space-md">
          <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-high px-space-md py-space-sm">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <div className="min-w-0 flex-col">
              <p className="truncate font-label-sm text-label-sm font-semibold text-on-surface">Hệ thống sẵn sàng</p>
              <p className="truncate font-code-sm text-code-sm text-outline">Quản trị TimeLens</p>
            </div>
          </div>
        </div>
      </aside>

      <div ref={shellRef} className="min-w-0 md:pl-64">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 min-w-0 items-center justify-between gap-space-sm border-b border-outline-variant bg-surface-container-lowest/80 px-3 shadow-[0_2px_10px_rgba(15,27,51,0.04)] backdrop-blur-xl sm:px-gutter-desktop md:left-64 md:gap-space-md">
          <div className={`flex min-w-0 flex-1 items-center gap-space-sm md:gap-space-lg ${isCustomerRevenue ? 'max-w-2xl' : 'max-w-xl'}`}>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="shrink-0 rounded-lg p-2 text-on-surface-variant hover:bg-surface-container md:hidden"
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
            <button type="button" onClick={() => setCmdOpen(true)} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container sm:hidden" aria-label="Tìm trang quản trị">
              <MaterialIcon name="search" className="text-[20px]" />
            </button>
            <button type="button" onClick={() => setCmdOpen(true)} className="admin-quick-search hidden w-full min-w-0 items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2 text-left font-body-sm text-body-sm text-on-surface-variant hover:border-primary sm:flex" aria-label="Tìm trang quản trị">
              <MaterialIcon name="search" className="text-[18px] text-primary" />
              <span className="min-w-0 flex-1 truncate">Tìm trang quản trị...</span>
              <kbd className="hidden rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-0.5 font-code-sm text-code-sm text-outline lg:inline-flex">{searchShortcut}</kbd>
            </button>
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
              <AdminAccountMenu avatarSrc={avatarSrc} />
            </div>
          </div>
        </header>

        {expiry.expiringSoon && expiry.expiresAt !== null && (
          <p role="status" className="fixed left-0 right-0 top-14 z-30 border-b border-outline-variant bg-surface-container-low px-gutter-desktop py-2 font-label-sm text-label-sm font-semibold text-tertiary md:left-64">
            Phiên đăng nhập sắp hết hạn lúc {new Date(expiry.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.
          </p>
        )}

        <main className={`min-h-screen w-full min-w-0 max-w-full overflow-x-clip bg-surface px-gutter-desktop pb-16 ${expiry.expiringSoon ? 'pt-[7.5rem]' : 'pt-20'}`}>
          <Outlet />
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <button type="button" aria-label="Đóng menu quản trị" className="absolute inset-0 w-full bg-black/70" onClick={closeDrawer} />
          <aside ref={drawerRef} className="admin-sidebar relative flex h-full w-72 flex-col border-r border-outline-variant bg-surface-container-lowest px-3 py-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="font-headline-sm font-semibold tracking-tight text-on-surface">TimeLens Admin</span>
              <button type="button" onClick={closeDrawer} aria-label="Đóng menu" className="rounded p-2 text-on-surface-variant">
                <MaterialIcon name="close" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}

      {cmdOpen && (
        <AdminModal title="Điều hướng nhanh" subtitle="Chọn trang quản trị bạn muốn mở" icon="search" initialFocusSelector="[data-admin-search]" onClose={() => setCmdOpen(false)}>
          <input
            data-admin-search
            aria-label="Tìm trang quản trị"
            aria-controls="admin-search-results"
            aria-activedescendant={filteredNav.length ? `admin-search-result-${activeResult}` : undefined}
            value={quickSearch}
            onChange={(event) => { setQuickSearch(event.target.value); setSelectedResult(0) }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedResult((index) => Math.max(0, Math.min(index + 1, filteredNav.length - 1))) }
              if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedResult((index) => Math.max(index - 1, 0)) }
              if (event.key === 'Enter' && filteredNav[activeResult]) { event.preventDefault(); go(filteredNav[activeResult].to) }
            }}
            placeholder="Nhập tên trang quản trị..."
            className="mb-4 w-full rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 font-body-md text-body-md text-on-surface shadow-sm focus:border-primary focus:outline-none"
          />
          <div className="mb-2 flex items-center justify-between text-sm text-on-surface-variant">
            <span>Trang quản trị</span><span>{filteredNav.length} kết quả</span>
          </div>
          <div id="admin-search-results" className="space-y-1">
            {filteredNav.map((item, index) => (
              <button id={`admin-search-result-${index}`} key={item.to} type="button" onMouseEnter={() => setSelectedResult(index)} onClick={() => go(item.to)} className={`admin-search-result flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left ${index === activeResult ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-surface-container-high'}`}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-container-high text-primary"><MaterialIcon name={item.icon} className="text-[18px]" /></span>
                  <span className="min-w-0"><span className="block font-semibold text-on-surface">{item.title}</span><span className="block text-sm text-on-surface-variant">{item.sub}</span></span>
                </span>
                <MaterialIcon name="arrow_forward" className="text-base text-outline" />
              </button>
            ))}
            {filteredNav.length === 0 && <p className="rounded-xl bg-surface-container-high px-4 py-6 text-center text-on-surface-variant">Không tìm thấy trang phù hợp.</p>}
          </div>
          <p className="mt-4 border-t border-outline-variant pt-3 text-sm text-on-surface-variant">↑ ↓ chọn trang · Enter mở · Esc đóng</p>
        </AdminModal>
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
                { to: '/admin/content', icon: 'add_location_alt', title: 'Quản lý nội dung', sub: 'Điểm khám phá, hiện vật và nhiệm vụ' },
                { to: '/admin/narrative-pilots', icon: 'auto_stories', title: 'Pilot cốt truyện', sub: 'Soạn và duyệt cốt truyện' },
                { to: '/admin/billing', icon: 'receipt_long', title: 'Thanh toán & CRM', sub: 'Doanh thu và yêu cầu tư vấn tổ chức' },
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
