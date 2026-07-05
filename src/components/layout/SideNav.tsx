// src/components/layout/SideNav.tsx
import { NavLink, useLocation } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import { Button } from '../ui/Button'
import type { AppMode } from '../../shared/context/modeContext'
import { useAppMode } from '../../shared/context/useAppMode'
import { useAuth } from '../../shared/auth/useAuth'
import type { UserRole } from '../../shared/auth/types'

const navItems = [
  { to: '/home', icon: 'home', label: 'Trang chủ', prefixes: ['/home'], modes: 'both' as const },
  { to: '/explore', icon: 'explore', label: 'Khám phá', prefixes: ['/explore', '/characters'], modes: 'online' as const },
  { to: '/scan', icon: 'qr_code_scanner', label: 'Quét mã', prefixes: ['/scan'], modes: 'offline' as const },
  { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', prefixes: ['/quests'], modes: 'both' as const },
  { to: '/artifacts', icon: 'history_edu', label: 'Cổ vật', prefixes: ['/artifacts'], modes: 'both' as const },
  { to: '/leaderboard', icon: 'leaderboard', label: 'Bảng xếp hạng', prefixes: ['/leaderboard'], modes: 'both' as const },
  { to: '/profile', icon: 'person', label: 'Hồ sơ', prefixes: ['/profile'], modes: 'both' as const },
  { to: '/settings', icon: 'settings', label: 'Cài đặt', prefixes: ['/settings'], modes: 'both' as const },
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
  { to: '/explore', icon: 'explore', label: 'Khám phá', modes: 'online' as const, prefixes: ['/explore', '/tour/360', '/time-portal', '/chat'] },
  { to: '/scan', icon: 'qr_code_scanner', label: 'Quét', modes: 'offline' as const, prefixes: ['/scan'] },
  { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', modes: 'both' as const, prefixes: ['/quests'] },
  { to: '/leaderboard', icon: 'leaderboard', label: 'Xếp hạng', modes: 'both' as const, prefixes: ['/leaderboard'] },
  { to: '/profile', icon: 'person', label: 'Hồ sơ', modes: 'both' as const, prefixes: ['/profile'] },
  { to: '/settings', icon: 'settings', label: 'Cài đặt', modes: 'both' as const, prefixes: ['/settings'] },
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

type SideNavProps = {
  activeBorder?: 'left' | 'right'
  showCta?: boolean
  onCtaClick?: () => void
}

function activeClasses(isActive: boolean, border: 'left' | 'right') {
  if (!isActive) {
    return 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50'
  }
  const borderClass =
    border === 'left'
      ? 'border-l-4 border-secondary bg-secondary-container/10'
      : 'border-r-4 border-secondary bg-secondary-container/10'
  return `text-secondary font-bold ${borderClass}`
}

export function SideNav({
  activeBorder = 'right',
  showCta = true,
  onCtaClick,
}: SideNavProps) {
  const { pathname } = useLocation()
  const { mode } = useAppMode()

  return (
    <nav className="hidden lg:flex h-screen w-[16rem] min-w-[16rem] fixed left-0 top-0 border-r border-outline-variant bg-surface-container-low flex-col py-lg px-md z-40">
      <SideNavBrand showSubtitle />
      <SideNavLinks activeBorder={activeBorder} mode={mode} pathname={pathname} iconOnly={false} />
      {showCta && (
        <div className="mt-auto pt-md shrink-0">
          <Button type="button" onClick={onCtaClick} className="w-full shadow-elev-1 hover:shadow-elev-2">
            Bắt đầu hành trình
            <MaterialIcon name="arrow_forward" className="text-[18px]" />
          </Button>
        </div>
      )}
    </nav>
  )
}

export function SideNavTablet({ activeBorder = 'right' }: { activeBorder?: 'left' | 'right' }) {
  const { pathname } = useLocation()
  const { mode } = useAppMode()

  return (
    <nav className="hidden md:flex lg:hidden h-screen w-16 min-w-[4rem] fixed left-0 top-0 border-r border-outline-variant bg-surface-container-low flex-col py-lg px-xs z-40 items-center">
      <img src="/brand/icon-192.png" alt="TimeLens" className="w-9 h-9 rounded-full border border-primary/40 object-cover shrink-0 mb-lg" />
      <SideNavLinks activeBorder={activeBorder} mode={mode} pathname={pathname} iconOnly={true} />
    </nav>
  )
}

export function SideNavMobile() {
  const { pathname } = useLocation()
  const { mode } = useAppMode()
  const { user } = useAuth()
  const items = filterNavItems(mobileNavItems, mode, user?.role, { excludeDesktopOnly: true })

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-surface-container-low/95 backdrop-blur-xl pb-safe">
      <div className="flex justify-around items-center h-14 px-xs">
        {items.map((item) => {
          const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-w-0 transition-colors duration-200 ${
                isActive ? 'text-secondary' : 'text-on-surface-variant'
              }`}
            >
              <MaterialIcon name={item.icon} filled={isActive} className="text-[22px]" />
              <span className="font-label-sm text-[10px] truncate max-w-full">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function SideNavBrand({ showSubtitle }: { showSubtitle: boolean }) {
  return (
    <div className="mb-xl flex items-center gap-md min-w-0">
      <img src="/brand/icon-192.png" alt="Team Logo" className="w-10 h-10 rounded-full border border-primary/40 object-cover shrink-0" />
      {showSubtitle && (
        <div className="flex flex-col min-w-0">
          <span className="font-headline-lg text-headline-lg font-bold text-primary truncate">TimeLens</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant truncate">Nhà du hành di sản</span>
        </div>
      )}
    </div>
  )
}

function SideNavLinks({
  activeBorder,
  mode,
  pathname,
  iconOnly,
}: {
  activeBorder: 'left' | 'right'
  mode: AppMode | null
  pathname: string
  iconOnly: boolean
}) {
  const { user } = useAuth()
  const items = filterNavItems(navItems, mode, user?.role)

  return (
    <div className="flex flex-col gap-sm flex-1 min-h-0 overflow-y-auto custom-scrollbar w-full">
      {items.map((item) => {
        const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
        return (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={`flex items-center gap-md p-md rounded-xl transition-all duration-200 min-w-0 justify-center lg:justify-start card-interactive ${activeClasses(isActive, activeBorder)}`}
          >
            <MaterialIcon name={item.icon} filled={isActive} className="shrink-0" />
            {!iconOnly && <span className="font-title-md text-title-md truncate hidden lg:inline">{item.label}</span>}
          </NavLink>
        )
      })}
    </div>
  )
}
