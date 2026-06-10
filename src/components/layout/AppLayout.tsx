import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SideNav, SideNavMobile, SideNavTablet } from './SideNav'
import { TopNavCompact } from './TopNav'

type AppLayoutProps = {
  children: ReactNode
  topNav?: ReactNode
  activeBorder?: 'left' | 'right'
  showCta?: boolean
  hideSideNav?: boolean
  hideMobileChrome?: boolean
  /** Mobile-only: back link in TopNavCompact (avoids double headers). */
  mobileBackTo?: string
  mobileTitle?: string
  className?: string
}

export function AppLayout({
  children,
  topNav,
  activeBorder = 'right',
  showCta = true,
  hideSideNav = false,
  hideMobileChrome = false,
  mobileBackTo,
  mobileTitle,
  className = '',
}: AppLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className={`antialiased min-h-screen flex bg-background ${className}`}>
      <div className="dong-son-bg fixed inset-0 pointer-events-none z-0" />
      {!hideSideNav && (
        <>
          <SideNav activeBorder={activeBorder} showCta={showCta} onCtaClick={() => navigate('/explore')} />
          <SideNavTablet activeBorder={activeBorder} />
        </>
      )}
      <div
        className={`flex-grow relative flex flex-col z-10 min-w-0 ${
          hideSideNav ? '' : 'md:ml-16 lg:ml-[16rem]'
        } ${!hideSideNav && !hideMobileChrome ? 'pb-16 md:pb-0' : ''}`}
      >
        {!hideMobileChrome && <TopNavCompact backTo={mobileBackTo} title={mobileTitle} />}
        {topNav}
        {children}
      </div>
      {!hideSideNav && !hideMobileChrome && <SideNavMobile />}
    </div>
  )
}
