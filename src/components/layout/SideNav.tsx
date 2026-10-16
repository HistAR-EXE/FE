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
    { to: '/explore', icon: 'explore', label: 'Khám phá', prefixes: ['/explore', '/home', '/characters'], modes: 'both' as const },

    // --- 3 TÍNH NĂNG ĐỘT PHÁ CỦA TIMELENS ---
    { to: `/tour/360/${CU_CHI_LOCATION_ID}`, icon: '360', label: 'Tham quan 360°', prefixes: ['/tour/360'], modes: 'online' as const },
    { to: `/diorama/${CU_CHI_LOCATION_ID}`, icon: 'layers', label: 'Sa bàn Lịch sử', prefixes: ['/diorama'], modes: 'online' as const },
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

const mobileNavItems: readonly NavigationItem[] = [
    { to: '/explore', icon: 'explore', label: 'Khám phá', modes: 'both' as const, prefixes: ['/explore', '/home', '/tour/360', '/diorama'] },
    { to: '/chat', icon: 'forum', label: 'Trợ lý AI', modes: 'both' as const, prefixes: ['/chat'] },
    { to: '/scan', icon: 'qr_code_scanner', label: 'Quét AR', modes: 'offline' as const, prefixes: ['/scan'] },
    { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', modes: 'both' as const, prefixes: ['/quests'] },
    { to: '/artifacts', icon: 'history_edu', label: 'Cổ vật', modes: 'both' as const, prefixes: ['/artifacts'] },
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
        logoGlow: 'from-[#FDC908] to-[#0275FB]',
        logoRing: 'border-[#FDC908]',
        brand: 'from-[#0275FB] via-[#0A66E8] to-[#015CC8]',
        tagline: 'text-slate-500',
        divider: 'border-[#0275FB]/15',
        idle: 'text-slate-600 hover:text-[#0275FB] hover:bg-[#0275FB]/[0.07] border-transparent',
        active: 'text-[#0275FB] font-bold',
        activeLeft: 'border-l-[3px] border-[#FDC908] bg-gradient-to-r from-[#FFF2C3] to-transparent shadow-sm',
        activeRight: 'border-r-[3px] border-[#FDC908] bg-gradient-to-l from-[#FFF2C3] to-transparent shadow-sm',
        iconActive: 'text-[#0275FB]',
        iconIdle: 'text-slate-400 group-hover:text-[#0275FB]',
        cta: 'bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] text-[#0F1B33] shadow-[0_6px_20px_rgba(253,201,8,0.45)] hover:shadow-[0_8px_26px_rgba(253,201,8,0.6)]',
        ctaIcon: 'bg-gradient-to-r from-[#FDC908] to-[#FFD93D] text-[#0F1B33] shadow-[0_4px_14px_rgba(253,201,8,0.5)]',
        mobileActive: 'text-[#0275FB] scale-105',
        mobileIdle: 'text-slate-500 hover:text-[#0275FB]',
    },
} as const

type SideNavProps = {
    activeBorder?: 'left' | 'right'
    showCta?: boolean
    onCtaClick?: () => void
    isCollapsed: boolean
    onToggle: () => void
}

function activeClasses(isActive: boolean, border: 'left' | 'right') {
    const t = TONES.light
    if (!isActive) return t.idle
    return `${t.active} ${border === 'left' ? t.activeLeft : t.activeRight}`
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
    const t = TONES.light

    const chatPath = useMemo(() => buildChatPath(), [])

    const items = withChatPath(filterNavItems(navItems, mode, user?.role), chatPath)

    return (
        <aside
            className={`hidden lg:flex h-screen fixed left-0 top-0 border-r backdrop-blur-2xl flex-col py-6 px-4 z-40 transition-all duration-300 ${t.shell} ${
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

            <div className={`mb-8 flex items-center gap-3 min-w-0 transition-all ${isCollapsed ? 'justify-center' : 'px-1'}`}>
                <div className="relative group shrink-0">
                    <div className={`absolute -inset-1 rounded-full bg-gradient-to-tr blur-sm opacity-60 group-hover:opacity-100 transition-opacity ${t.logoGlow}`} />
                    <img src="/brand/icon-192.png" alt="TimeLens Logo" className={`relative w-10 h-10 rounded-full border object-cover ${t.logoRing}`} />
                </div>

                {!isCollapsed && (
                    <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className={`text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r truncate ${t.brand}`}>
                            TimeLens
                        </span>
                        <span className={`text-[10px] font-semibold tracking-wide truncate ${t.tagline}`}>
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

            {showCta && (
                <div className={`mt-auto pt-4 shrink-0 border-t ${t.divider}`}>
                    {isCollapsed ? (
                        <button
                            type="button"
                            onClick={onCtaClick}
                            title="Bắt đầu hành trình"
                            className={`w-full h-12 rounded-xl flex items-center justify-center hover:scale-105 transition-all cursor-pointer ${t.ctaIcon}`}
                        >
                            <MaterialIcon name="rocket_launch" className="text-xl font-bold" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCtaClick}
                            className={`w-full py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all cursor-pointer ${t.cta}`}
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
    const t = TONES.light
    const chatPath = useMemo(() => buildChatPath(), [])
    const items = withChatPath(filterNavItems(navItems, mode, user?.role), chatPath)

    return (
        <nav className={`hidden md:flex lg:hidden h-screen w-20 fixed left-0 top-0 border-r backdrop-blur-2xl flex-col py-6 px-2.5 z-40 items-center ${t.shellTablet}`}>
            <img src="/brand/icon-192.png" alt="TimeLens" className={`w-10 h-10 rounded-full border object-cover shrink-0 mb-8 shadow-md ${t.logoRing}`} />
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
