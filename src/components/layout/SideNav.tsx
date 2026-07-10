/* eslint-disable react-refresh/only-export-components */
// src/components/layout/SideNav.tsx
import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import type { AppMode } from '../../shared/context/modeContext'
import { useAppMode } from '../../shared/context/useAppMode'
import { useAuth } from '../../shared/auth/useAuth'
import type { UserRole } from '../../shared/auth/types'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { buildChatPath } from '../../features/chat/chatRoute'

// THÊM ĐẦY ĐỦ CÁC TÍNH NĂNG TIÊU BIỂU VÀ ĐẶC SẮC RA THÀNH SLIDE NAV CHÍNH
const navItems = [
    { to: '/home', icon: 'home', label: 'Trang chủ', prefixes: ['/home'], modes: 'both' as const },
    { to: '/explore', icon: 'explore', label: 'Khám phá', prefixes: ['/explore', '/characters'], modes: 'online' as const },

    // --- 3 TÍNH NĂNG ĐỘT PHÁ CỦA TIMELENS ---
    { to: `/tour/360/${CU_CHI_LOCATION_ID}`, icon: '360', label: 'Tham quan 360°', prefixes: ['/tour/360'], modes: 'online' as const },
    { to: `/time-portal/${CU_CHI_LOCATION_ID}`, icon: 'compare', label: 'Cổng thời gian', prefixes: ['/time-portal'], modes: 'online' as const },
    { to: '/chat', icon: 'forum', label: 'Trò chuyện AI', prefixes: ['/chat'], modes: 'both' as const },

    // --- TÍNH NĂNG CHỈ DÀNH CHO THỰC ĐỊA ONSITE ---
    { to: '/scan', icon: 'qr_code_scanner', label: 'Quét thực địa', prefixes: ['/scan'], modes: 'offline' as const },

    { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', prefixes: ['/quests'], modes: 'both' as const },
    { to: '/artifacts', icon: 'history_edu', label: 'Cổ vật', prefixes: ['/artifacts'], modes: 'both' as const },
    { to: '/leaderboard', icon: 'leaderboard', label: 'Xếp hạng', prefixes: ['/leaderboard'], modes: 'both' as const },
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

const mobileNavItems = [
    { to: '/home', icon: 'home', label: 'Trang chủ', modes: 'both' as const, prefixes: ['/home'] },
    { to: '/explore', icon: 'explore', label: 'Khám phá', modes: 'online' as const, prefixes: ['/explore', '/tour/360', '/time-portal'] },
    { to: '/chat', icon: 'forum', label: 'Trợ lý AI', modes: 'both' as const, prefixes: ['/chat'] },
    { to: '/scan', icon: 'qr_code_scanner', label: 'Quét AR', modes: 'offline' as const, prefixes: ['/scan'] },
    { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', modes: 'both' as const, prefixes: ['/quests'] },
] as const

type NavItem = {
    modes: 'online' | 'offline' | 'both'
    roles?: readonly UserRole[]
    desktopOnly?: boolean
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

// BỔ SUNG 2 PROPS: isCollapsed và onToggle
type SideNavProps = {
    activeBorder?: 'left' | 'right'
    showCta?: boolean
    onCtaClick?: () => void
    isCollapsed: boolean
    onToggle: () => void
}

function activeClasses(isActive: boolean, border: 'left' | 'right') {
    if (!isActive) {
        return 'text-gray-400 hover:text-white hover:bg-white/[0.05] border-transparent'
    }
    const borderClass =
        border === 'left'
            ? 'border-l-[3px] border-[#fe951c] bg-gradient-to-r from-[#fe951c]/20 to-transparent shadow-sm'
            : 'border-r-[3px] border-[#fe951c] bg-gradient-to-l from-[#fe951c]/20 to-transparent shadow-sm'
    return `text-[#fdb438] font-bold ${borderClass}`
}

export function SideNav({
                            activeBorder = 'right',
                            showCta = true,
                            onCtaClick,
                            isCollapsed,
                            onToggle,
                        }: SideNavProps) {
    const { pathname } = useLocation()
    const { mode } = useAppMode()
    const { user } = useAuth()

    const chatPath = useMemo(() => buildChatPath(), [])

    const withChatPath = <T extends { to: string }>(items: readonly T[]) =>
        items.map((item) => (item.to === '/chat' ? { ...item, to: chatPath } : item))

    const items = withChatPath(filterNavItems(navItems, mode, user?.role))

    return (
        <aside
            className={`hidden lg:flex h-screen fixed left-0 top-0 border-r border-white/10 bg-[#141620]/95 backdrop-blur-2xl flex-col py-6 px-4 z-40 transition-all duration-300 shadow-2xl ${
                isCollapsed ? 'w-20 min-w-[5rem]' : 'w-64 min-w-[16rem]'
            }`}
        >
            <div className="absolute -right-3.5 top-7 z-50">
                <button
                    type="button"
                    onClick={onToggle}
                    className="w-7 h-7 rounded-full bg-[#1b1e2c] border border-[#fdb438]/50 text-gray-300 hover:text-[#fdb438] flex items-center justify-center shadow-lg transition-transform hover:scale-110 group relative cursor-pointer"
                    title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                >
                    <MaterialIcon name={isCollapsed ? 'chevron_right' : 'chevron_left'} className="text-lg" />
                    <span className="absolute left-full ml-3 px-2.5 py-1 bg-[#232636] border border-white/10 text-white text-[11px] font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                        {isCollapsed ? 'Mở thanh bên' : 'Đóng thanh bên'}
                    </span>
                </button>
            </div>

            <div className={`mb-8 flex items-center gap-3 min-w-0 transition-all ${isCollapsed ? 'justify-center' : 'px-1'}`}>
                <div className="relative group shrink-0">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#fe951c] to-[#388cf1] blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
                    <img src="/brand/icon-192.png" alt="TimeLens Logo" className="relative w-10 h-10 rounded-full border border-[#fdb438]/60 object-cover" />
                </div>

                {!isCollapsed && (
                    <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-[#fdb438] truncate">
                            TimeLens
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 tracking-wide truncate">
                            Relive History, Reshape Heritage
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar w-full pr-1">
                {items.map((item) => {
                    const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={isCollapsed ? item.label : undefined}
                            className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 min-w-0 group relative ${
                                isCollapsed ? 'justify-center' : 'justify-start'
                            } ${activeClasses(isActive, activeBorder)}`}
                        >
                            <MaterialIcon name={item.icon} filled={isActive} className={`text-xl shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-[#fe951c]' : 'text-gray-400 group-hover:text-white'}`} />
                            {!isCollapsed && (
                                <span className="text-sm tracking-wide truncate">{item.label}</span>
                            )}
                            {isCollapsed && (
                                <span className="absolute left-full ml-4 px-3 py-1.5 bg-[#1b1e2c] border border-white/10 text-white text-xs font-semibold rounded-lg shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                    {item.label}
                                </span>
                            )}
                        </NavLink>
                    )
                })}
            </div>

            {showCta && (
                <div className="mt-auto pt-4 shrink-0 border-t border-white/10">
                    {isCollapsed ? (
                        <button
                            type="button"
                            onClick={onCtaClick}
                            title="Bắt đầu hành trình"
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#fdb438] text-black flex items-center justify-center shadow-[0_0_15px_rgba(254,149,28,0.4)] hover:scale-105 transition-all cursor-pointer"
                        >
                            <MaterialIcon name="rocket_launch" className="text-xl font-bold" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCtaClick}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#e07d0b] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(254,149,28,0.35)] hover:shadow-[0_6px_25px_rgba(254,149,28,0.5)] hover:scale-[1.02] transition-all cursor-pointer"
                        >
                            <span>Bắt đầu hành trình</span>
                            <MaterialIcon name="arrow_forward" className="text-lg font-bold" />
                        </button>
                    )}
                </div>
            )}
        </aside>
    )
}

export function SideNavTablet({ activeBorder = 'right' }: { activeBorder?: 'left' | 'right' }) {
    const { pathname } = useLocation()
    const { mode } = useAppMode()
    const { user } = useAuth()
    const chatPath = useMemo(() => buildChatPath(), [])
    const withChatPath = <T extends { to: string }>(items: readonly T[]) =>
        items.map((item) => (item.to === '/chat' ? { ...item, to: chatPath } : item))
    const items = withChatPath(filterNavItems(navItems, mode, user?.role))

    return (
        <nav className="hidden md:flex lg:hidden h-screen w-20 fixed left-0 top-0 border-r border-white/10 bg-[#141620]/95 backdrop-blur-2xl flex-col py-6 px-2.5 z-40 items-center shadow-xl">
            <img src="/brand/icon-192.png" alt="TimeLens" className="w-10 h-10 rounded-full border border-[#fdb438]/50 object-cover shrink-0 mb-8 shadow-md" />
            <div className="flex flex-col gap-2 flex-1 w-full overflow-y-auto custom-scrollbar">
                {items.map((item) => {
                    const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            title={item.label}
                            className={`flex items-center justify-center p-3.5 rounded-xl transition-all ${activeClasses(isActive, activeBorder)}`}
                        >
                            <MaterialIcon name={item.icon} filled={isActive} className="text-2xl" />
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}

export function SideNavMobile() {
    const { pathname } = useLocation()
    const { mode } = useAppMode()
    const { user } = useAuth()
    const chatPath = useMemo(() => buildChatPath(), [])
    const withChatPath = <T extends { to: string }>(items: readonly T[]) =>
        items.map((item) => (item.to === '/chat' ? { ...item, to: chatPath } : item))
    const items = withChatPath(filterNavItems(mobileNavItems, mode, user?.role, { excludeDesktopOnly: true }))

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#141620]/95 backdrop-blur-2xl pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.6)]">
            <div className="flex justify-around items-center h-16 px-2">
                {items.map((item) => {
                    const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-all duration-200 ${
                                isActive ? 'text-[#fdb438] scale-105' : 'text-gray-400 hover:text-white'
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