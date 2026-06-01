import { NavLink, useLocation } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'

const navItems = [
  { to: '/home', icon: 'home', label: 'Trang chủ', prefixes: ['/home'] },
  { to: '/explore', icon: 'explore', label: 'Khám phá', prefixes: ['/explore', '/characters'] },
  { to: '/scan', icon: 'qr_code_scanner', label: 'Quét mã', prefixes: ['/scan'] },
  { to: '/quests', icon: 'assignment', label: 'Nhiệm vụ', prefixes: ['/quests'] },
  { to: '/artifacts', icon: 'history_edu', label: 'Cổ vật', prefixes: ['/artifacts'] },
  { to: '/leaderboard', icon: 'leaderboard', label: 'Bảng xếp hạng', prefixes: ['/leaderboard'] },
  { to: '/profile', icon: 'person', label: 'Hồ sơ', prefixes: ['/profile'] },
] as const

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
  return (
    <nav className="hidden md:flex h-screen w-[16rem] min-w-[16rem] fixed left-0 top-0 border-r border-outline-variant bg-surface-container-low flex-col py-lg px-md z-40">
      <div className="mb-xl flex items-center gap-md min-w-0">
        <MaterialIcon name="timelapse" className="text-primary text-[32px] shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="font-headline-lg text-headline-lg font-bold text-primary truncate">TimeLens</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant truncate">Neo-Heritage</span>
        </div>
      </div>

      <div className="flex flex-col gap-sm flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-md p-md rounded-lg transition-all duration-200 min-w-0 ${activeClasses(isActive, activeBorder)}`}
            >
              <MaterialIcon name={item.icon} filled={isActive} className="shrink-0" />
              <span className="font-title-md text-title-md truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </div>

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
