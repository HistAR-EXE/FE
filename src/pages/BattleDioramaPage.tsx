// src/pages/BattleDioramaPage.tsx
import { useParams } from 'react-router-dom'
import { useCallback, useRef, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../shared/auth/useAuth'
import { useVisitSessionForLocation } from '../features/visit/VisitSessionProvider'
import { BattleDioramaViewer } from '../features/diorama/BattleDioramaViewer'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { exploreApi } from '../features/explore/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'

export function BattleDioramaPage() {
    const { locationId } = useParams<{ locationId?: string }>()
    const activeLocationId = locationId ?? CU_CHI_LOCATION_ID

    // Vẫn giữ lại tracking session người dùng truy cập địa điểm
    const { isAuthenticated } = useAuth()
    useVisitSessionForLocation(activeLocationId, isAuthenticated)
    const [saveFailed, setSaveFailed] = useState(false)
    const saving = useRef(false)
    const recordExperience = useCallback(async () => {
        if (!isAuthenticated || activeLocationId !== CU_CHI_LOCATION_ID || saving.current) return
        saving.current = true
        try {
            await exploreApi.recordDiorama(activeLocationId)
            setSaveFailed(false)
            window.dispatchEvent(new CustomEvent(DISCOVERY_RECORDED_EVENT))
        } catch { setSaveFailed(true) }
        finally { saving.current = false }
    }, [activeLocationId, isAuthenticated])

    return (
        <AppLayout
            activeBorder="left"
            mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
            mobileTitle="Sa bàn Lịch sử"
        >
            <main className="flex-1 flex flex-col relative mt-14 md:mt-0 h-[calc(100dvh-3.5rem)] md:h-screen pb-16 md:pb-0">
                <section className="relative flex-1 bg-[#050505] overflow-hidden">
                    {/* KHỞI CHẠY SA BÀN CHIẾN DỊCH CEDAR FALLS */}
                    {saveFailed && <div role="status" className="absolute top-3 inset-x-3 z-50 rounded-xl bg-white p-3 text-sm text-slate-900">
                        Chưa lưu được trải nghiệm sa bàn. <button type="button" onClick={() => void recordExperience()} className="underline">Thử lưu lại</button>
                    </div>}
                    <BattleDioramaViewer onStart={() => void recordExperience()} />
                </section>
            </main>
        </AppLayout>
    )
}
