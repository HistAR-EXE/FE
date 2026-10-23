/* eslint-disable react-refresh/only-export-components */
// src/components/layout/SideNav.tsx
import { useMemo } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import type { AppMode } from '../../shared/context/modeContext'
import { useAppMode } from '../../shared/context/useAppMode'
import { useAuth } from '../../shared/auth/useAuth'
import type { UserRole } from '../../shared/auth/types'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { timePortalPath } from '../../shared/config/locationSlug'
import { SideNavAccount } from './SideNavAccount'
import { buildChatPath } from '../../features/chat/chatRoute'

type NavItem = {
    modes: 'online' | 'offline' | 'both'
    roles?: readonly UserRole[]
    desktopOnly?: boolean
}

type NavigationItem = NavItem & {
    readonly to: string
    readonly icon: string
    readonly label: string
    readonly prefixes: readonly string[]
}

const navItems: readonly NavigationItem[] = [
    { to: '/explore', icon: 'explore', label: 'Khám phá di tích', prefixes: ['/explore', '/home', '/characters'], modes: 'both' as const },

    // --- 3 TÍNH NĂNG ĐỘT PHÁ CỦA TIMELENS ---
    { to: `/tour/360/${CU_CHI_LOCATION_ID}`, icon: '360', label: 'Tham quan 360°', prefixes: ['/tour/360'], modes: 'online' as const },
    { to: `/diorama/${CU_CHI_LOCATION_ID}`, icon: 'layers', label: 'Tái hiện lịch sử', prefixes: ['/diorama'], modes: 'online' as const },
    { to: timePortalPath(CU_CHI_LOCATION_ID), icon: 'history', label: 'Cổng Thời Gian', prefixes: ['/time-portal'], modes: 'online' as const },
    { to: '/chat', icon: 'forum', label: 'Trợ lý lịch sử AI', prefixes: ['/chat'], modes: 'both' as const },

    // Trung tâm AR dùng chung cho khám phá từ xa và hành trình tại di tích.
    { to: '/ar-experience', icon: 'view_in_ar', label: 'Trải nghiệm AR', prefixes: ['/ar-experience', '/scan'], modes: 'both' as const },

    { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', prefixes: ['/quests'], modes: 'both' as const },
    { to: '/artifacts', icon: 'history_edu', label: 'Bảo tàng 3D', prefixes: ['/artifacts'], modes: 'both' as const },
    { to: '/leaderboard', icon: 'leaderboard', label: 'Bảng xếp hạng', prefixes: ['/leaderboard'], modes: 'both' as const },
    {
        to: '/admin/content',
        icon: 'admin_panel_settings',
        label: 'Quản trị',
        prefixes: ['/admin'],
        modes: 'both' as const,
        roles: ['ADMIN'] as const,
        desktopOnly: true,
    },
] as const

const mobileNavItems: readonly NavigationItem[] = [
    { to: '/explore', icon: 'explore', label: 'Khám phá', modes: 'both' as const, prefixes: ['/explore', '/home', '/tour/360', '/diorama', '/time-portal'] },
    { to: '/chat', icon: 'forum', label: 'Trợ lý AI', modes: 'both' as const, prefixes: ['/chat'] },
    { to: '/ar-experience', icon: 'view_in_ar', label: 'AR', modes: 'both' as const, prefixes: ['/ar-experience', '/scan'] },
    { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', modes: 'both' as const, prefixes: ['/quests'] },
    { to: '/artifacts', icon: 'history_edu', label: 'Bảo tàng', modes: 'both' as const, prefixes: ['/artifacts'] },
] as const

function withChatPath(items: readonly NavigationItem[], chatPath: string): NavigationItem[] {
    return items.map((item) => (item.to === '/chat' ? { ...item, to: chatPath } : item))
}

function effectiveMode(mode: AppMode | null): AppMode {
    return mode ?? 'online'
}

export function filterNavItemsByMode<T extends NavItem>(items: readonly T[], mode: AppMode | null): T[] {
    const active = effectiveMode(mode)
    return items.filter((item) => item.modes === 'both' || item.modes === active)
}

export function filterNavItems<T extends NavItem>(
    items: readonly T[],
    mode: AppMode | null,
    userRole: UserRole | null | undefined,
    options?: { excludeDesktopOnly?: boolean },
): T[] {
    return filterNavItemsByMode(items, mode).filter((item) => {
        if (options?.excludeDesktopOnly && item.desktopOnly) return false
        if (!item.roles) return true
        return userRole != null && item.roles.includes(userRole)
    })
}

/* ───────────── Giao diện: Khóa cứng Light Mode (sáng, màu thương hiệu) ───────────── */
const TONES = {
    light: {
        shell: 'border-[#0275FB]/20 bg-white/95 shadow-[6px_0_32px_-8px_rgba(2,117,251,0.25)]',
        shellTablet: 'border-[#0275FB]/20 bg-white/95 shadow-[6px_0_32px_-8px_rgba(2,117,251,0.25)]',
        shellMobile: 'border-[#0275FB]/20 bg-white/95 shadow-[0_-8px_28px_-8px_rgba(2,117,251,0.25)]',
        toggle: 'bg-white border-[#0275FB]/40 text-[#0275FB] hover:bg-[#0275FB] hover:text-white',
        toggleTip: 'bg-[#0F1B33] border-transparent text-white',
        itemTip: 'bg-[#0F1B33] border-transparent text-white',
        brand: 'from-[#0275FB] via-[#0A66E8] to-[#015CC8]',
        tagline: 'text-slate-500',
        divider: 'border-[#0275FB]/15',
        idle: 'text-slate-600 hover:text-[#0275FB] hover:bg-[#0275FB]/[0.07] border-transparent',
        active: 'text-[#0275FB] font-bold',
        activeLeft: 'border-l-[3px] border-[#FDC908] bg-gradient-to-r from-[#FFF2C3] to-transparent shadow-sm',
        iconActive: 'text-[#0275FB]',
        iconIdle: 'text-slate-400 group-hover:text-[#0275FB]',
        mobileActive: 'text-[#0275FB] scale-105',
        mobileIdle: 'text-slate-500 hover:text-[#0275FB]',
    },
} as const

type SideNavProps = {
    isCollapsed: boolean
    onToggle: () => void
}

function activeClasses(isActive: boolean) {
    const t = TONES.light
    if (!isActive) return t.idle
    return `${t.active} ${t.activeLeft}`
}

export function SideNav({
                            isCollapsed,
                            onToggle,
                        }: SideNavProps) {
    const { pathname } = useLocation()
    const { mode } = useAppMode()
    const { user } = useAuth()
    const t = TONES.light

    const chatPath = useMemo(() => buildChatPath(), [])

    const items = withChatPath(filterNavItems(navItems, mode, user?.role), chatPath)

    return (
        <aside aria-label="Thanh điều hướng"
            className={`hidden lg:flex h-dvh fixed left-0 top-0 border-r backdrop-blur-2xl flex-col py-3 px-4 z-40 transition-all duration-300 ${t.shell} ${
                isCollapsed ? 'w-20 min-w-[5rem]' : 'w-64 min-w-[16rem]'
            }`}
        >
            <div className="absolute -right-3.5 top-7 z-50">
                <button
                    type="button"
                    onClick={onToggle}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center shadow-lg transition-transform hover:scale-110 group relative cursor-pointer ${t.toggle}`}
                    title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                >
                    <MaterialIcon name={isCollapsed ? 'chevron_right' : 'chevron_left'} className="text-lg" />
                    <span className={`absolute left-full ml-3 px-2.5 py-1 border text-[11px] font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity ${t.toggleTip}`}>
                        {isCollapsed ? 'Mở thanh bên' : 'Đóng thanh bên'}
                    </span>
                </button>
            </div>

            <Link to="/" aria-label="TimeLens - Về trang chủ" title="Về trang chủ" className={`mb-3 flex shrink-0 items-center gap-2 min-w-0 rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0275FB] ${isCollapsed ? 'justify-center' : ''}`}>
                <img src="/brand/icon-192.png" alt="TimeLens Logo" className="h-10 w-8 shrink-0 object-contain" />

                {!isCollapsed && (
                    <div className="flex min-w-0 flex-col">
                        <span className={`text-lg font-black leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r truncate ${t.brand}`}>
                            TimeLens
                        </span>
                        <span className={`text-[10px] font-semibold leading-4 tracking-[-0.02em] whitespace-nowrap ${t.tagline}`}>
                            Relive History, Reshape Heritage
                        </span>
                    </div>
                )}
            </Link>

            <div className="flex flex-col justify-between gap-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar w-full pr-1">
                {items.map((item) => {
                    const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={isCollapsed ? item.label : undefined}
                            className={`flex items-center gap-3 px-3 h-10 shrink-0 [@media(max-height:700px)]:h-9 rounded-xl transition-all duration-200 min-w-0 group relative ${
                                isCollapsed ? 'justify-center' : 'justify-start'
                            } ${activeClasses(isActive)}`}
                        >
                            <MaterialIcon name={item.icon} filled={isActive} className={`text-xl shrink-0 transition-transform group-hover:scale-110 ${isActive ? t.iconActive : t.iconIdle}`} />
                            {!isCollapsed && (
                                <span className="text-sm tracking-wide truncate">{item.label}</span>
                            )}
                            {isCollapsed && (
                                <span className={`absolute left-full ml-4 px-3 py-1.5 border text-xs font-semibold rounded-lg shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 ${t.itemTip}`}>
                                    {item.label}
                                </span>
                            )}
                        </NavLink>
                    )
                })}
            </div>

            <div className={`mt-2 shrink-0 border-t pt-2 ${t.divider}`}>
                <SideNavAccount compact={isCollapsed} />
            </div>
        </aside>
    )
}

export function SideNavTablet() {
    const { pathname } = useLocation()
    const { mode } = useAppMode()
    const { user } = useAuth()
    const t = TONES.light
    const chatPath = useMemo(() => buildChatPath(), [])
    const items = withChatPath(filterNavItems(navItems, mode, user?.role), chatPath)

    return (
        <nav className={`hidden md:flex lg:hidden h-dvh w-20 fixed left-0 top-0 border-r backdrop-blur-2xl flex-col py-3 px-2.5 z-40 items-center ${t.shellTablet}`}>
            <Link to="/" aria-label="TimeLens - Về trang chủ" title="Về trang chủ" className="mb-4 flex h-11 w-full shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-[#0275FB]"><img src="/brand/icon-192.png" alt="TimeLens" className="h-10 w-8 object-contain" /></Link>
            <div className="flex flex-col justify-between gap-1 flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar">
                {items.map((item) => {
                    const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={item.label}
                            className={`flex items-center justify-center h-10 shrink-0 [@media(max-height:700px)]:h-9 rounded-xl transition-all ${activeClasses(isActive)}`}
                        >
                            <MaterialIcon name={item.icon} filled={isActive} className="text-2xl" />
                        </NavLink>
                    )
                })}
            </div>
            <div className="mt-2 w-full shrink-0 border-t border-blue-100 pt-2"><SideNavAccount compact /></div>
        </nav>
    )
}

export function SideNavMobile() {
    const { pathname } = useLocation()
    const { mode } = useAppMode()
    const { user } = useAuth()
    const t = TONES.light
    const chatPath = useMemo(() => buildChatPath(), [])
    const items = withChatPath(filterNavItems(mobileNavItems, mode, user?.role, { excludeDesktopOnly: true }), chatPath)

    return (
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-2xl pb-safe ${t.shellMobile}`}>
            <div className="flex justify-around items-center h-16 px-2">
                {items.map((item) => {
                    const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-all duration-200 ${
                                isActive ? t.mobileActive : t.mobileIdle
                            }`}
                        >
                            <MaterialIcon name={item.icon} filled={isActive} className="text-2xl" />
                            <span className="font-bold text-[10px] tracking-tight truncate max-w-full">{item.label}</span>
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
