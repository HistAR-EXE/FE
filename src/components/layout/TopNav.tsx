// src/components/layout/TopNav.tsx
import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import { images } from '../../assets/images'
import { useAppMode } from '../../shared/context/useAppMode'
import { modeBadgeLabel } from '../../shared/context/appModeUtils'
import { OfflineSyncBadge } from './OfflineSyncBadge'
import { AppSettingsBar } from './AppSettingsBar'
import { useAuth } from '../../shared/auth/useAuth'
import { useUserAvatar } from '../../shared/auth/useUserAvatar'
import { isAdmin, isTeacher } from '../../shared/auth/types'

function RoleBadge() {
    const { user, isAuthenticated } = useAuth()
    if (!isAuthenticated || !user) return null
    if (isAdmin(user)) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#fe951c]/40 bg-[#fe951c]/15 text-[#fdb438] font-bold text-[10px] shrink-0">
        Admin
      </span>
        )
    }
    if (user?.role === 'ORG_MEMBER') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 font-bold text-[10px] shrink-0">
        Thành viên
      </span>
        )
    }
    if (isTeacher(user) && user.role === 'TEACHER') {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#388cf1]/40 bg-[#388cf1]/15 text-[#388cf1] font-bold text-[10px] shrink-0">
        Giáo viên
      </span>
        )
    }
    return null
}

export function ModeBadge({ className = '' }: { className?: string }) {
    const { mode } = useAppMode()
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const label = !isAuthenticated ? 'Đăng nhập' : modeBadgeLabel(mode)

    const onBadgeClick = () => {
        const from = `${location.pathname}${location.search}`
        if (!isAuthenticated) {
            navigate('/login', { state: { from } })
            return
        }
        if (location.pathname === '/mode-select') return
        navigate('/mode-select', { state: { from } })
    }

    return (
        <div className="inline-flex items-center gap-1.5 shrink-0">
            <OfflineSyncBadge />
            <RoleBadge />
            <button
                type="button"
                onClick={onBadgeClick}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                    mode === 'offline'
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'border-[#388cf1]/50 bg-[#388cf1]/15 text-[#388cf1] hover:bg-[#388cf1]/25 shadow-[0_0_12px_rgba(56,140,241,0.25)]'
                } ${className}`}
                title="Đổi cấu hình trải nghiệm"
            >
                <MaterialIcon name={mode === 'offline' ? 'location_on' : 'public'} className="text-[15px]" />
                <span className="hidden sm:inline font-black text-xs tracking-wide">{label}</span>
            </button>
        </div>
    )
}

function UserAvatarDropdown({ avatarSrc }: { avatarSrc: string }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const handleNavigation = (path: string) => {
        setIsOpen(false)
        navigate(path)
    }

    const handleLogout = () => {
        setIsOpen(false)
        logout()
        navigate('/login')
    }

    return (
        <div className="relative inline-block text-left shrink-0 ml-2" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-[#1b1e2c] border-2 border-[#fe951c]/60 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#fdb438] hover:scale-105 transition-all cursor-pointer shadow-md"
                title="Tài khoản cá nhân"
            >
                <img alt="Avatar" className="w-full h-full object-cover" src={avatarSrc} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#161824]/95 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl py-2 z-50 animate-[fadeIn_0.15s_ease-out]">
                    <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-xs font-black text-white truncate">
                            {user?.displayName || 'Thành viên TimeLens'}
                        </p>
                        <p className="text-[11px] font-medium text-gray-400 truncate mt-0.5">
                            {user?.email || '—'}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#fe951c]/20 text-[#fdb438] text-[9px] font-black uppercase tracking-wider">
                Thành viên TimeLens
              </span>
                        </div>
                    </div>

                    <div className="py-1.5">
                        <button
                            type="button"
                            onClick={() => handleNavigation('/profile')}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
                        >
                            <MaterialIcon name="person" className="text-base text-[#fdb438]" />
                            <span>Hồ sơ cá nhân</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleNavigation('/settings')}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
                        >
                            <MaterialIcon name="settings" className="text-base text-[#388cf1]" />
                            <span>Cài đặt hệ thống</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleNavigation('/mode-select')}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
                        >
                            <MaterialIcon name="tune" className="text-base text-emerald-400" />
                            <span>Đổi chế độ & AI RAG</span>
                        </button>

                        {isAdmin(user) && (
                            <button
                                type="button"
                                onClick={() => handleNavigation('/admin/content')}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-amber-300 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer"
                            >
                                <MaterialIcon name="admin_panel_settings" className="text-base" />
                                <span>Cổng quản trị Admin</span>
                            </button>
                        )}
                    </div>

                    <div className="pt-1.5 border-t border-white/10">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors cursor-pointer"
                        >
                            <MaterialIcon name="logout" className="text-base" />
                            <span>Đăng xuất tài khoản</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export function TopNavCompact({ backTo, title }: { backTo?: string; title?: string }) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10 bg-[#0f1015]/80 flex justify-between items-center h-14 px-4 md:hidden">
            {backTo ? (
                <Link
                    to={backTo}
                    className="inline-flex items-center gap-1 min-w-0 text-gray-300 hover:text-white transition-colors"
                >
                    <MaterialIcon name="arrow_back" className="shrink-0 text-xl" />
                    <span className="font-bold text-sm truncate">{title ?? 'Quay lại'}</span>
                </Link>
            ) : (
                <Link to="/home" className="inline-flex items-center gap-2 min-w-0">
                    <img src="/brand/icon-192.png" alt="TimeLens" className="w-7 h-7 rounded-full border border-[#fe951c]/60 object-cover shrink-0" />
                    <span className="font-black text-base text-white truncate">{title ?? 'TimeLens'}</span>
                </Link>
            )}
            <ModeBadge />
        </header>
    )
}

export function HomeTopNav({ avatarSrc }: { avatarSrc?: string }) {
    const defaultAvatar = useUserAvatar(images.avatarHomeV3)
    const resolvedAvatar = avatarSrc ?? defaultAvatar

    return (
        <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-white/10 bg-[#0f1015]/80 justify-between items-center h-16 px-6 hidden md:flex">
            <div className="flex-1" />
            <div className="flex items-center gap-3">
                <OfflineSyncBadge />
                <RoleBadge />
                <button type="button" className="p-2 text-gray-400 hover:text-white transition-all rounded-full hover:bg-white/10 cursor-pointer" title="Thông báo mới">
                    <MaterialIcon name="notifications" />
                </button>
                <UserAvatarDropdown avatarSrc={resolvedAvatar} />
            </div>
        </header>
    )
}

export function ExploreTopNav({ avatarSrc, backTo = '/home', backLabel = 'Trang chủ' }: { avatarSrc?: string; backTo?: string; backLabel?: string }) {
    const defaultAvatar = useUserAvatar(images.avatarExploreV3)
    const resolvedAvatar = avatarSrc ?? defaultAvatar

    return (
        <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-white/10 bg-[#0f1015]/80 hidden md:flex justify-between items-center h-16 px-6 gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
                {backTo && (
                    <Link
                        to={backTo}
                        className="inline-flex items-center gap-1.5 shrink-0 text-gray-300 hover:text-[#fdb438] transition-colors font-bold text-xs"
                        title={backLabel}
                    >
                        <MaterialIcon name="arrow_back" className="text-lg" />
                        <span className="hidden xl:inline truncate max-w-[8rem]">{backLabel}</span>
                    </Link>
                )}
                <div className="relative w-full max-w-sm md:max-w-md lg:max-w-[20rem] min-w-0">
                    <MaterialIcon
                        name="search"
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none"
                    />
                    <input
                        className="w-full bg-[#1b1e2c] border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-[#fe951c] focus:ring-1 focus:ring-[#fe951c] transition-all"
                        placeholder="Tìm kiếm di tích, triều đại..."
                        type="text"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <AppSettingsBar className="hidden sm:flex" />
                <ModeBadge className="hidden sm:inline-flex" />
                <UserAvatarDropdown avatarSrc={resolvedAvatar} />
            </div>
        </header>
    )
}

export function DetailTopNav({ avatarSrc }: { avatarSrc?: string }) {
    const defaultAvatar = useUserAvatar(images.avatarDetailV3)
    const resolvedAvatar = avatarSrc ?? defaultAvatar

    return (
        <nav className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-white/10 bg-[#0f1015]/80 justify-between items-center h-16 px-6 hidden md:flex">
            <Link to="/home" className="inline-flex items-center gap-2.5 font-black text-xl text-white tracking-tight">
                <img src="/brand/icon-192.png" alt="Logo" className="w-8 h-8 rounded-full border border-[#fe951c]/60 object-cover" />
                <span>TimeLens</span>
            </Link>
            <div className="flex items-center gap-3">
                <AppSettingsBar />
                <ModeBadge />
                <button type="button" className="text-gray-400 hover:text-white transition-all p-2 rounded-full hover:bg-white/10 cursor-pointer" title="Thông báo">
                    <MaterialIcon name="notifications" />
                </button>
                <UserAvatarDropdown avatarSrc={resolvedAvatar} />
            </div>
        </nav>
    )
}

export function SimpleTopNav({ title, avatarSrc, showSearch = false, backTo, backLabel = 'Quay lại' }: { title?: string; avatarSrc?: string; showSearch?: boolean; backTo?: string; backLabel?: string }) {
    const defaultAvatar = useUserAvatar(images.avatarHomeV3)
    const resolvedAvatar = avatarSrc ?? defaultAvatar

    return (
        <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-white/10 bg-[#0f1015]/80 justify-between items-center h-16 px-6 hidden md:flex gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
                {backTo && (
                    <Link
                        to={backTo}
                        className="inline-flex items-center gap-1.5 shrink-0 text-gray-300 hover:text-[#fdb438] transition-colors font-bold text-xs"
                        title={backLabel}
                    >
                        <MaterialIcon name="arrow_back" className="text-lg" />
                        <span className="hidden lg:inline truncate max-w-[10rem]">{backLabel}</span>
                    </Link>
                )}
                {title ? (
                    <span className="font-black text-lg text-white truncate">{title}</span>
                ) : (
                    !backTo && <div className="flex-1" />
                )}
            </div>
            <div className="flex items-center gap-3">
                <AppSettingsBar />
                <ModeBadge />
                {showSearch && (
                    <div className="relative">
                        <MaterialIcon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
                        <input
                            className="bg-[#1b1e2c] border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#fe951c] w-48"
                            placeholder="Tìm kiếm..."
                            type="text"
                        />
                    </div>
                )}
                <UserAvatarDropdown avatarSrc={resolvedAvatar} />
            </div>
        </header>
    )
}

export function ScanTopNav({ avatarSrc }: { avatarSrc?: string }) {
    const defaultAvatar = useUserAvatar(images.avatarExploreV3)
    const resolvedAvatar = avatarSrc ?? defaultAvatar

    return (
        <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-white/10 bg-[#0f1015]/80 hidden md:flex justify-between items-center h-16 px-6">
            <div className="flex items-center gap-3 min-w-0">
                <span className="font-black text-lg text-white truncate">Trung tâm Quét Di sản</span>
                <ModeBadge className="hidden sm:inline-flex" />
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <div className="relative hidden lg:block">
                    <MaterialIcon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
                    <input
                        className="bg-[#1b1e2c] border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-xs font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-[#388cf1] w-64"
                        placeholder="Tìm kiếm mã di sản..."
                        type="text"
                    />
                </div>
                <button type="button" className="text-gray-400 hover:text-white transition-colors cursor-pointer" title="Thông báo">
                    <MaterialIcon name="notifications" />
                </button>
                <UserAvatarDropdown avatarSrc={resolvedAvatar} />
            </div>
        </header>
    )
}