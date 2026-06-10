import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import { images } from '../../assets/images'
import { useAppMode } from '../../shared/context/useAppMode'
import { modeBadgeLabel } from '../../shared/context/appModeUtils'
import { useAuth } from '../../shared/auth/useAuth'

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
    <button
      type="button"
      onClick={onBadgeClick}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border border-secondary/40 bg-secondary/10 text-secondary font-label-sm text-label-sm hover:bg-secondary/20 transition-colors shrink-0 ${className}`}
      title="Đổi chế độ khám phá"
    >
      <MaterialIcon name={mode === 'offline' ? 'location_on' : 'home'} className="text-[14px]" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

type TopNavCompactProps = {
  backTo?: string
  title?: string
}

export function TopNavCompact({ backTo, title }: TopNavCompactProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 flex justify-between items-center h-14 px-md md:hidden">
      {backTo ? (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 min-w-0 text-on-surface-variant hover:text-secondary transition-colors"
        >
          <MaterialIcon name="arrow_back" className="shrink-0 text-[22px]" />
          <span className="font-title-md text-title-md truncate">{title ?? 'Quay lại'}</span>
        </Link>
      ) : (
        <Link to="/explore" className="inline-flex items-center gap-2 min-w-0">
          <img src="/brand/icon-192.png" alt="TimeLens" className="w-8 h-8 rounded-full border border-primary/40 object-cover shrink-0" />
          <span className="font-headline-lg text-headline-lg font-bold text-primary truncate">{title ?? 'TimeLens'}</span>
        </Link>
      )}
      <ModeBadge />
    </header>
  )
}

type HomeTopNavProps = {
  avatarSrc?: string
}

export function HomeTopNav({ avatarSrc = images.avatarHomeV3 }: HomeTopNavProps) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 flex justify-between items-center h-16 px-xl hidden md:flex">
      <div className="flex-1" />
      <div className="flex items-center gap-md">
        <ModeBadge className="hidden md:inline-flex" />
        <button type="button" className="p-2 text-on-surface-variant hover:text-secondary transition-all rounded-full hover:bg-surface-variant/50">
          <MaterialIcon name="notifications" />
        </button>
        <button type="button" className="p-2 text-on-surface-variant hover:text-secondary transition-all rounded-full hover:bg-surface-variant/50">
          <MaterialIcon name="settings" />
        </button>
        <div className="w-10 h-10 rounded-full bg-surface-variant border-2 border-primary overflow-hidden ml-sm cursor-pointer">
          <img alt="User Avatar" className="w-full h-full object-cover" src={avatarSrc} />
        </div>
      </div>
    </header>
  )
}

type ExploreTopNavProps = {
  avatarSrc?: string
}

export function ExploreTopNav({ avatarSrc = images.avatarExploreV3 }: ExploreTopNavProps) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 hidden md:flex justify-between items-center h-16 px-xl">
      <div className="relative w-full max-w-sm md:max-w-md lg:max-w-[24rem]">
        <MaterialIcon
          name="search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
        />
        <input
          className="w-full bg-surface-container border border-outline-variant rounded-full py-2 pl-10 pr-4 font-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all"
          placeholder="Tìm kiếm di tích, triều đại..."
          type="text"
        />
      </div>
      <div className="flex items-center gap-md shrink-0">
        <ModeBadge className="hidden sm:inline-flex" />
        <button type="button" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-variant/50 transition-all">
          <MaterialIcon name="notifications" />
        </button>
        <button type="button" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-variant/50 transition-all">
          <MaterialIcon name="settings" />
        </button>
        <div className="w-10 h-10 rounded-full bg-surface-variant border-2 border-primary/50 overflow-hidden cursor-pointer hover:shadow-[0_0_10px_rgba(242,191,80,0.4)] transition-all">
          <img alt="User Avatar" className="w-full h-full object-cover" src={avatarSrc} />
        </div>
      </div>
    </header>
  )
}

type DetailTopNavProps = {
  avatarSrc?: string
}

export function DetailTopNav({ avatarSrc = images.avatarDetailV3 }: DetailTopNavProps) {
  return (
    <nav className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 flex justify-between items-center h-16 px-xl hidden md:flex">
      <Link to="/" className="inline-flex items-center gap-2 font-display-lg text-display-lg font-bold text-primary tracking-tight">
        <img src="/brand/icon-192.png" alt="Team Logo" className="w-8 h-8 rounded-full border border-primary/40 object-cover" />
        TimeLens
      </Link>
      <div className="flex items-center gap-md">
        <ModeBadge />
        <button type="button" className="text-on-surface-variant hover:text-secondary transition-all p-2 rounded-full hover:bg-surface-variant/50">
          <MaterialIcon name="notifications" />
        </button>
        <button type="button" className="text-on-surface-variant hover:text-secondary transition-all p-2 rounded-full hover:bg-surface-variant/50">
          <MaterialIcon name="settings" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant">
          <img alt="User Avatar" className="w-full h-full object-cover" src={avatarSrc} />
        </div>
      </div>
    </nav>
  )
}

type SimpleTopNavProps = {
  title?: string
  avatarSrc?: string
  showSearch?: boolean
}

export function SimpleTopNav({ title, avatarSrc = images.avatarHomeV3, showSearch = false }: SimpleTopNavProps) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 flex justify-between items-center h-16 px-xl hidden md:flex">
      {title ? (
        <span className="font-headline-lg text-headline-lg text-primary">{title}</span>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex items-center gap-md">
        <ModeBadge />
        {showSearch && (
          <div className="relative">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
            <input
              className="bg-surface-container border border-outline-variant/30 rounded-full py-1.5 pl-9 pr-4 text-body-md w-48"
              placeholder="Tìm kiếm..."
              type="text"
            />
          </div>
        )}
        <button type="button" className="p-2 text-on-surface-variant hover:text-secondary rounded-full hover:bg-surface-variant/50">
          <MaterialIcon name="notifications" />
        </button>
        <button type="button" className="p-2 text-on-surface-variant hover:text-secondary rounded-full hover:bg-surface-variant/50">
          <MaterialIcon name="settings" />
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
          <img alt="User Avatar" className="w-full h-full object-cover" src={avatarSrc} />
        </div>
      </div>
    </header>
  )
}

type ScanTopNavProps = {
  avatarSrc?: string
}

export function ScanTopNav({ avatarSrc = images.avatarExploreV3 }: ScanTopNavProps) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 hidden md:flex justify-between items-center h-16 px-xl">
      <div className="flex items-center gap-sm min-w-0">
        <span className="font-headline-lg text-headline-lg font-bold text-primary truncate">Trung tâm Quét Di sản</span>
        <ModeBadge className="hidden sm:inline-flex" />
      </div>
      <div className="flex items-center gap-lg shrink-0">
        <div className="relative hidden lg:block">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
          <input
            className="bg-surface-variant border border-outline-variant rounded-full py-1.5 pl-10 pr-4 font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary w-64"
            placeholder="Tìm kiếm mã di sản..."
            type="text"
          />
        </div>
        <button type="button" className="text-on-surface-variant hover:text-secondary transition-colors">
          <MaterialIcon name="notifications" />
        </button>
        <button type="button" className="text-on-surface-variant hover:text-secondary transition-colors">
          <MaterialIcon name="settings" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-variant border border-primary/30 overflow-hidden ml-sm cursor-pointer">
          <img alt="User Avatar" className="w-full h-full object-cover" src={avatarSrc} />
        </div>
      </div>
    </header>
  )
}
