// src/pages/BattleDioramaPage.tsx
import { useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../shared/auth/useAuth'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'
import { BattleDioramaViewer } from '../features/diorama/BattleDioramaViewer'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'

export function BattleDioramaPage() {
    const { locationId } = useParams<{ locationId?: string }>()
    const activeLocationId = locationId ?? CU_CHI_LOCATION_ID

    // Vẫn giữ lại tracking session người dùng truy cập địa điểm
    const { isAuthenticated } = useAuth()
    useVisitSessionForLocation(activeLocationId, isAuthenticated)

    return (
        <AppLayout
            activeBorder="left"
            mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
            mobileTitle="Sa bàn Lịch sử"
        >
            <main className="flex-1 flex flex-col relative mt-14 md:mt-0 h-[calc(100dvh-3.5rem)] md:h-screen pb-16 md:pb-0">
                <section className="relative flex-1 bg-[#050505] overflow-hidden">
                    {/* KHỞI CHẠY SA BÀN CHIẾN DỊCH CEDAR FALLS */}
                    <BattleDioramaViewer />
                </section>
            </main>
        </AppLayout>
    )
}