import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SideNav } from './SideNav'

type AppLayoutProps = {
  children: ReactNode
  topNav?: ReactNode
  activeBorder?: 'left' | 'right'
  showCta?: boolean
  hideSideNav?: boolean
  className?: string
}

export function AppLayout({
  children,
  topNav,
  activeBorder = 'right',
  showCta = true,
  hideSideNav = false,
  className = '',
}: AppLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className={`antialiased min-h-screen flex bg-background ${className}`}>
      <div className="dong-son-bg fixed inset-0 pointer-events-none z-0" />
      {!hideSideNav && (
        <SideNav activeBorder={activeBorder} showCta={showCta} onCtaClick={() => navigate('/explore')} />
      )}
      <div className={`flex-grow relative flex flex-col z-10 min-w-0 ${hideSideNav ? '' : 'md:ml-[16rem]'}`}>
        {topNav}
        {children}
      </div>
    </div>
  )
}
