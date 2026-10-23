import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'
import { useUserAvatar } from '../../shared/auth/useUserAvatar'
import { isAdmin, isTeacher } from '../../shared/auth/types'
import { MaterialIcon } from '../ui/MaterialIcon'

const PERSONAL_LINKS = [
    { to: '/profile', icon: 'person', label: 'Hồ sơ cá nhân' },
    { to: '/settings', icon: 'settings', label: 'Cài đặt' },
    { to: '/journey-wrapped', icon: 'auto_awesome', label: 'Tổng kết hành trình' },
    { to: '/groups', icon: 'school', label: 'Nhóm học tập' },
    { to: '/squad', icon: 'groups', label: 'Biệt đội của tôi' },
    { to: '/photo-frame', icon: 'photo_camera', label: 'Khung ảnh cá nhân' },
    { to: '/share', icon: 'share', label: 'Chia sẻ hành trình' },
    { to: '/pricing', icon: 'workspace_premium', label: 'Gói dịch vụ' },
]

export function SideNavAccount({ compact = false }: { compact?: boolean }) {
    const { user, isAuthenticated, logout } = useAuth()
    const avatar = useUserAvatar()
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const panelId = useId()
    const accountActive = PERSONAL_LINKS.some(link => pathname === link.to || pathname.startsWith(`${link.to}/`))

    useEffect(() => {
        if (!open) return
        const outside = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false)
                triggerRef.current?.focus()
            }
        }
        const resize = () => setOpen(false)
        rootRef.current?.querySelector<HTMLAnchorElement>('nav a')?.focus()
        document.addEventListener('pointerdown', outside)
        document.addEventListener('keydown', escape)
        window.addEventListener('resize', resize)
        return () => {
            document.removeEventListener('pointerdown', outside)
            document.removeEventListener('keydown', escape)
            window.removeEventListener('resize', resize)
        }
    }, [open])

    if (!isAuthenticated || !user) {
        return <Link to="/login" aria-label="Đăng nhập tài khoản" title={compact ? 'Đăng nhập' : undefined}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-2 py-3 text-sm font-bold text-[#0275FB]">
            <MaterialIcon name="login" />{!compact && 'Đăng nhập'}
        </Link>
    }

    const links = [
        ...PERSONAL_LINKS,
        ...(isTeacher(user) ? [{ to: '/teacher', icon: 'co_present', label: 'Cổng giáo viên' }] : []),
        ...(isAdmin(user) ? [{ to: '/admin', icon: 'admin_panel_settings', label: 'Cổng quản trị' }] : []),
    ]
    const membership = isAdmin(user) ? 'Quản trị viên' : user.role === 'TEACHER' ? 'Giáo viên'
        : user.tier === 'PREMIUM' ? 'Premium' : user.orgId ? 'Thành viên tổ chức' : 'Miễn phí'

    return <div ref={rootRef} className="relative w-full" onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
    }}>
        <button ref={triggerRef} type="button" aria-label="Mở tài khoản cá nhân" aria-expanded={open} aria-controls={panelId}
            title={compact ? `${user.displayName} · ${membership}` : undefined} onClick={() => setOpen(value => !value)}
            className={`flex w-full items-center gap-2.5 rounded-xl border-l-[3px] py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#0275FB] ${compact ? 'justify-center px-0' : 'px-2.5'} ${open || accountActive ? 'border-[#FDC908] bg-gradient-to-r from-[#FFF2C3] to-transparent' : 'border-transparent hover:bg-blue-50'}`}>
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0275FB] font-bold text-white">
                {user.displayName.trim().slice(0, 1).toUpperCase() || 'T'}
                <img src={avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none' }} />
            </span>
            {!compact && <>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">{user.displayName}</span>
                    <span className="block text-[11px] leading-4 font-semibold text-slate-500">{membership}</span>
                </span>
                <MaterialIcon name={open ? 'expand_more' : 'expand_less'} className="shrink-0 text-slate-500" />
            </>}
        </button>
        {open && <div id={panelId} className={`absolute z-[70] w-96 max-w-[calc(100vw-6rem)] rounded-2xl border border-blue-100 bg-white p-2 shadow-[0_12px_48px_rgba(15,27,51,0.2)] ${compact ? 'bottom-0 left-full ml-4' : 'bottom-full left-0 mb-3'}`}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5">
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800" title={user.displayName}>{user.displayName}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500" title={user.email}>{user.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">{membership}</span>
            </div>
            <nav aria-label="Liên kết tài khoản" className="grid grid-cols-2 gap-1 py-2">
                {links.map(link => <NavLink key={link.to} to={link.to} end onClick={() => setOpen(false)}
                    className={({ isActive }) => `flex min-h-10 items-center gap-2 rounded-lg border-l-[3px] px-2 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#0275FB] ${isActive ? 'border-[#FDC908] bg-gradient-to-r from-[#FFF2C3] to-transparent text-[#0275FB]' : 'border-transparent text-slate-700 hover:bg-blue-50 hover:text-[#0275FB]'}`}>
                    <MaterialIcon name={link.icon} className="shrink-0 text-lg text-[#0275FB]" /><span className="min-w-0 leading-4">{link.label}</span>
                </NavLink>)}
            </nav>
            <div className="border-t border-slate-100 pt-1">
                <button type="button" onClick={() => { setOpen(false); logout(); navigate('/login') }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500">
                    <MaterialIcon name="logout" className="text-xl" />Đăng xuất
                </button>
            </div>
        </div>}
    </div>
}
