// src/components/layout/SideNavAccount.tsx
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'
import { useUserAvatar } from '../../shared/auth/useUserAvatar'
import { isAdmin, isTeacher } from '../../shared/auth/types'
import { MaterialIcon } from '../ui/MaterialIcon'

const PERSONAL_LINKS = [
    { to: '/profile', icon: 'person', label: 'Hồ sơ cá nhân' },
    { to: '/settings', icon: 'settings', label: 'Cài đặt' },
    { to: '/pricing', icon: 'workspace_premium', label: 'Gói dịch vụ' },
    { to: '/settings/billing', icon: 'receipt_long', label: 'Lịch sử thanh toán' },
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
    const accountActive = PERSONAL_LINKS.some(
        (link) => pathname === link.to || pathname.startsWith(`${link.to}/`),
    )

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
        return (
            <Link
                to="/login"
                aria-label="Đăng nhập tài khoản"
                title={compact ? 'Đăng nhập' : undefined}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#FDC908] bg-gradient-to-r from-[#FFF2C3] via-[#FDC908] to-[#FDB900] px-3 py-3 text-xs font-black uppercase tracking-wider text-[#0F1B33] shadow-[0_6px_18px_rgba(253,201,8,0.3)] transition-all hover:brightness-105"
            >
                <MaterialIcon name="login" className="text-lg text-[#0275FB]" />
                {!compact && <span>Đăng nhập</span>}
            </Link>
        )
    }

    const links = [
        ...PERSONAL_LINKS,
        ...(isTeacher(user)
            ? [{ to: '/teacher', icon: 'co_present', label: 'Cổng giáo viên' }]
            : []),
        ...(isAdmin(user)
            ? [{ to: '/admin', icon: 'admin_panel_settings', label: 'Cổng quản trị' }]
            : []),
    ]
    const membership = isAdmin(user)
        ? 'Quản trị viên'
        : user.role === 'TEACHER'
            ? 'Giáo viên'
            : user.tier === 'PREMIUM'
                ? 'Premium'
                : user.orgId
                    ? 'Thành viên tổ chức'
                    : 'Miễn phí'

    return (
        <div
            ref={rootRef}
            className="relative w-full font-sans"
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                    setOpen(false)
            }}
        >
            <button
                ref={triggerRef}
                type="button"
                aria-label="Mở tài khoản cá nhân"
                aria-expanded={open}
                aria-controls={panelId}
                title={compact ? `${user.displayName} · ${membership}` : undefined}
                onClick={() => setOpen((value) => !value)}
                className={`flex w-full items-center gap-2.5 rounded-2xl border-l-[3px] py-2 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0275FB] ${
                    compact ? 'justify-center px-0' : 'px-2.5'
                } ${
                    open || accountActive
                        ? 'border-[#FDC908] bg-gradient-to-r from-[#FFF2C3] via-[#FFFBEB] to-transparent shadow-2xs'
                        : 'border-transparent hover:bg-[#EAF3FF]'
                }`}
            >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#FDC908] bg-gradient-to-br from-[#0353B8] to-[#0275FB] font-black text-white shadow-xs">
          {user.displayName.trim().slice(0, 1).toUpperCase() || 'T'}
            <img
                src={avatar}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                    event.currentTarget.style.display = 'none'
                }}
            />
        </span>
                {!compact && (
                    <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-[#0F1B33]">
                {user.displayName}
              </span>
              <span className="block text-[11px] leading-4 font-bold text-[#0275FB]">
                {membership}
              </span>
            </span>
                        <MaterialIcon
                            name={open ? 'expand_more' : 'expand_less'}
                            className="shrink-0 text-slate-500"
                        />
                    </>
                )}
            </button>

            {open && (
                <div
                    id={panelId}
                    className={`absolute z-[70] w-96 max-w-[calc(100vw-6rem)] overflow-hidden rounded-3xl border-2 border-[#0275FB]/20 bg-white p-2.5 shadow-[0_20px_55px_rgba(15,27,51,0.22)] ${
                        compact ? 'bottom-0 left-full ml-4' : 'bottom-full left-0 mb-3'
                    }`}
                >
                    {/* Header thẻ tài khoản */}
                    <div className="flex items-start justify-between gap-3 rounded-2xl border-b-2 border-[#FDC908] bg-gradient-to-r from-[#0353B8] via-[#0275FB] to-[#014296] px-4 py-3 text-white">
                        <div className="min-w-0">
                            <p
                                className="truncate text-sm font-black text-white"
                                title={user.displayName}
                            >
                                {user.displayName}
                            </p>
                            <p
                                className="mt-0.5 truncate text-xs font-medium text-blue-100"
                                title={user.email}
                            >
                                {user.email}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/60 bg-gradient-to-r from-[#FFF2C3] to-[#FDC908] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0F1B33] shadow-2xs">
              {membership}
            </span>
                    </div>

                    {/* Danh sách điều hướng tài khoản */}
                    <nav
                        aria-label="Liên kết tài khoản"
                        className="grid grid-cols-1 gap-1.5 py-2.5"
                    >
                        {links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end
                                onClick={() => setOpen(false)}
                                className={({ isActive }) =>
                                    `flex min-h-11 items-center gap-2.5 rounded-xl border-l-[3px] px-2.5 py-2 text-xs font-extrabold transition-all focus-visible:outline-2 focus-visible:outline-[#0275FB] ${
                                        isActive
                                            ? 'border-[#FDC908] bg-gradient-to-r from-[#FFF2C3]/80 to-[#F2F7FF] text-[#0275FB] shadow-2xs'
                                            : 'border-transparent bg-[#F8FBFF] text-[#0F1B33] hover:bg-[#EAF3FF] hover:text-[#0275FB]'
                                    }`
                                }
                            >
                                <MaterialIcon
                                    name={link.icon}
                                    className="shrink-0 text-lg text-[#0275FB]"
                                />
                                <span className="min-w-0 leading-4">{link.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Nút Đăng xuất */}
                    <div className="border-t border-slate-100 pt-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false)
                                logout()
                                navigate('/login')
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-black text-red-600 transition-colors hover:bg-red-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-red-500"
                        >
                            <MaterialIcon name="logout" className="text-lg" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
