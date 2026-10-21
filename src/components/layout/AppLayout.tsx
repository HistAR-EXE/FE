// src/components/layout/AppLayout.tsx
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { SideNav, SideNavMobile, SideNavTablet } from './SideNav'
import { TopNavCompact } from './TopNav'
import { useCcuHeartbeat } from '../../shared/hooks/useCcuHeartbeat'
import { CcuLimitModal } from '../monetization/CcuLimitModal'

type AppLayoutProps = {
    children: ReactNode
    topNav?: ReactNode
    /** Legacy page props: sidebar now uses one consistent highlight and account footer. */
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
                              hideSideNav = false,
                              hideMobileChrome = false,
                              mobileBackTo,
                              mobileTitle,
                              className = '',
                          }: AppLayoutProps) {
    const location = useLocation()
    const { ccuLimitOpen, dismissCcuLimit } = useCcuHeartbeat()

    // Tự động ghi nhận trải nghiệm khi người dùng truy cập các tính năng trên menu trái
    useEffect(() => {
        const path = location.pathname
        if (path.startsWith('/tour/360')) {
            localStorage.setItem('timelens_exp_tour360', '1')

        } else if (path.startsWith('/chat')) {
            localStorage.setItem('timelens_exp_chat', '1')
        } else if (path.startsWith('/artifacts')) {
            localStorage.setItem('timelens_exp_artifacts', '1')
        }
    }, [location.pathname])

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
                        isCollapsed={isCollapsed}
                        onToggle={handleToggleNav}
                    />
                    <SideNavTablet />
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