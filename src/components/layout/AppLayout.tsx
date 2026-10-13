// src/components/layout/AppLayout.tsx
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SideNav, SideNavMobile, SideNavTablet } from './SideNav'
import { TopNavCompact } from './TopNav'
import { useAppMode } from '../../shared/context/useAppMode'
import { useCcuHeartbeat } from '../../shared/hooks/useCcuHeartbeat'
import { CcuLimitModal } from '../monetization/CcuLimitModal'

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
    const { mode } = useAppMode()
    const { ccuLimitOpen, dismissCcuLimit } = useCcuHeartbeat()
    const ctaPath = mode === 'offline' ? '/scan' : '/explore'

    // Quản lý trạng thái thu gọn SideNav toàn cục (lưu vào localStorage)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('sidenav_collapsed') === 'true'
        } catch {
            return false
        }
    })

    // Hàm xử lý khi bấm nút Đóng/Mở
    const handleToggleNav = () => {
        setIsCollapsed((prev) => {
            const val = !prev
            localStorage.setItem('sidenav_collapsed', String(val))
            return val
        })
    }

    // Tự động tính toán Margin trái: Thu gọn thì cách 80px (w-20), mở rộng thì cách 256px (16rem)
    const desktopMargin = isCollapsed ? 'lg:ml-20' : 'lg:ml-[16rem]'

    return (
        <div className={`antialiased min-h-screen flex bg-background ${className}`}>
            <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-neutral-50 to-neutral-100" />

            {!hideSideNav && (
                <>
                    <SideNav
                        activeBorder={activeBorder}
                        showCta={showCta}
                        onCtaClick={() => navigate(ctaPath)}
                        isCollapsed={isCollapsed}
                        onToggle={handleToggleNav}
                    />
                    <SideNavTablet activeBorder={activeBorder} />
                </>
            )}

            {/* VÙNG NỘI DUNG CHÍNH: Cập nhật Transition-all để trượt mượt mà khi đổi Margin */}
            <div
                className={`flex-grow relative flex flex-col z-10 min-w-0 transition-all duration-300 ease-in-out w-full ${
                    hideSideNav ? '' : `md:ml-20 ${desktopMargin}`
                } ${!hideSideNav && !hideMobileChrome ? 'pb-16 md:pb-0' : ''}`}
            >
                {!hideMobileChrome && <TopNavCompact backTo={mobileBackTo} title={mobileTitle} />}
                {topNav}
                {children}
            </div>

            {!hideSideNav && !hideMobileChrome && <SideNavMobile />}
            <CcuLimitModal open={ccuLimitOpen} onClose={dismissCcuLimit} />
        </div>
    )
}