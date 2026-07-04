import { NavLink, useLocation } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import type { AppMode } from '../../shared/context/modeContext'
import { useAppMode } from '../../shared/context/useAppMode'

const navItems = [
  { to: '/home', icon: 'home', label: 'Trang chủ', prefixes: ['/home'], modes: 'both' as const },
  { to: '/explore', icon: 'explore', label: 'Khám phá', prefixes: ['/explore', '/characters'], modes: 'online' as const },
  { to: '/scan', icon: 'qr_code_scanner', label: 'Quét mã', prefixes: ['/scan'], modes: 'offline' as const },
  { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', prefixes: ['/quests'], modes: 'both' as const },
  { to: '/artifacts', icon: 'history_edu', label: 'Cổ vật', prefixes: ['/artifacts'], modes: 'both' as const },
  { to: '/leaderboard', icon: 'leaderboard', label: 'Bảng xếp hạng', prefixes: ['/leaderboard'], modes: 'both' as const },
  { to: '/profile', icon: 'person', label: 'Hồ sơ', prefixes: ['/profile'], modes: 'both' as const },
] as const

const mobileNavItems = [
  { to: '/explore', icon: 'explore', label: 'Khám phá', modes: 'online' as const, prefixes: ['/explore', '/tour/360', '/time-portal', '/chat'] },
  { to: '/scan', icon: 'qr_code_scanner', label: 'Quét', modes: 'offline' as const, prefixes: ['/scan'] },
  { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', modes: 'both' as const, prefixes: ['/quests'] },
  { to: '/leaderboard', icon: 'leaderboard', label: 'Xếp hạng', modes: 'both' as const, prefixes: ['/leaderboard'] },
  { to: '/profile', icon: 'person', label: 'Hồ sơ', modes: 'both' as const, prefixes: ['/profile'] },
] as const

type SideNavProps = {
  activeBorder?: 'left' | 'right'
  showCta?: boolean
  onCtaClick?: () => void
}

function itemPriorityClass(mode: AppMode | null, itemModes: 'online' | 'offline' | 'both'): string {
  if (mode === null) return ''
  if (itemModes === 'both') return ''
  if (mode === 'online' && itemModes === 'offline') return 'opacity-50'
  if (mode === 'offline' && itemModes === 'online') return 'opacity-50'
  return ''
}

function activeClasses(isActive: boolean, border: 'left' | 'right', priorityDimmed: boolean) {
  if (!isActive) {
    return `text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 ${priorityDimmed ? 'opacity-50' : ''}`
  }
  const borderClass =
    border === 'left'
      ? 'border-l-4 border-secondary bg-secondary-container/10'
      : 'border-r-4 border-secondary bg-secondary-container/10'
  return `text-secondary font-bold ${borderClass}`
}

function filterMobileItems(mode: AppMode | null) {
  if (mode === null) return mobileNavItems
  return mobileNavItems.filter((item) => {
    if (item.modes === 'both') return true
    return item.modes === mode
  })
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
          <button
            type="button"
            onClick={onCtaClick}
            className="w-full py-sm px-md rounded-lg bg-primary text-on-primary font-title-md text-title-md shadow-[0_0_15px_rgba(242,191,80,0.3)] hover:shadow-[0_0_25px_rgba(242,191,80,0.5)] transition-all flex items-center justify-center gap-sm"
          >
            Bắt đầu hành trình
            <MaterialIcon name="arrow_forward" className="text-[18px]" />
          </button>
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
  const items = filterMobileItems(mode)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-surface-container-low/95 backdrop-blur-xl pb-safe">
      <div className="flex justify-around items-center h-14 px-xs">
        {items.map((item) => {
          const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-w-0 ${
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
  return (
    <div className="flex flex-col gap-sm flex-1 min-h-0 overflow-y-auto custom-scrollbar w-full">
      {navItems.map((item) => {
        const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
        const dimmed = itemPriorityClass(mode, item.modes) !== ''
        return (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={`flex items-center gap-md p-md rounded-lg transition-all duration-200 min-w-0 justify-center lg:justify-start ${activeClasses(isActive, activeBorder, dimmed)} ${itemPriorityClass(mode, item.modes)}`}
          >
            <MaterialIcon name={item.icon} filled={isActive} className="shrink-0" />
            {!iconOnly && <span className="font-title-md text-title-md truncate hidden lg:inline">{item.label}</span>}
          </NavLink>
        )
      })}
    </div>
  )
}
