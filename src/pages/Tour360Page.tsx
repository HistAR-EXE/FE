// src/pages/Tour360Page.tsx
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Tour360Hud } from '../components/panorama/Tour360Hud'

const CU_CHI_LOCATION_ID = '11111111-1111-1111-1111-111111111111'

// ĐÃ CẬP NHẬT: Đổi sang link Tour 360 của Yoolife để test thử CSP
const EXTERNAL_360_URL = 'https://vr360.yoolife.vn/ia-ao-cu-chi-zbdsc253u26822s3642'

// TỐI ƯU HIỆU NĂNG 1: Dùng React.memo để cô lập iFrame.
// Đảm bảo iFrame chỉ load ĐÚNG 1 LẦN duy nhất, không bị re-render (gây đen màn hình) khi thao tác với UI bên ngoài.
const OptimizedExternalTour = React.memo(() => {
    return (
        <iframe
            src={EXTERNAL_360_URL}
            className="w-full h-full border-0"
            allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen; microphone; camera" // Thêm microphone/camera phòng trường hợp cô gái AI của Yoolife cần
            loading="lazy"
            referrerPolicy="no-referrer"
            title="Virtual Tour 360"
        />
    )
})

export function Tour360Page() {
    const { locationId } = useParams<{ locationId?: string }>()
    const activeLocationId = locationId ?? CU_CHI_LOCATION_ID

    const [immersive, setImmersive] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    // TỐI ƯU HIỆU NĂNG 2 & CHE LOGO: Giữ màn hình Loading của TimeLens trong 5 giây
    // để đợi iFrame bên dưới tải xong dữ liệu 3D nặng của Yoolife.
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 5000)
        return () => clearTimeout(timer)
    }, [])

    const handleToggleImmersive = useCallback(() => {
        setImmersive((v) => !v)
    }, [])

    return (
        <AppLayout
            activeBorder="left"
            hideSideNav={immersive}
            hideMobileChrome={immersive}
            mobileBackTo={locationId ? `/explore/${locationId}` : '/explore'}
            mobileTitle="Tour 360°"
            className={immersive ? 'tour360-layout tour360-layout--immersive' : 'tour360-layout'}
        >
            <main className={`relative w-full h-full bg-[#0B1120] overflow-hidden flex flex-col ${immersive ? '' : 'tour360-main--with-nav'}`}>

                {/* KHỐI TRUNG TÂM: NHÚNG IFRAME ĐÃ TỐI ƯU */}
                <div className="absolute inset-0 z-10 bg-black overflow-hidden">
                    {/*
                        THỦ THUẬT CẮT (CROP) UI CHÍNH XÁC:
                        - top-0 left-0: Neo chặt góc trên trái để GIỮ NGUYÊN icon menu.
                        - ĐÃ TĂNG: w-[calc(100%+220px)]: Mở rộng sang phải 220px (thay vì 160px) để giấu triệt để cụm icon đỏ bên phải.
                        - h-[calc(100%+100px)]: Kéo dài xuống dưới 100px để CẮT BỎ 3 icon công cụ dưới đáy.
                    */}
                    <div className="absolute top-0 left-0 w-[calc(100%+220px)] h-[calc(100%+100px)]">
                        <OptimizedExternalTour />
                    </div>
                </div>

                {/* TRẠNG THÁI LOADING UI TỐI ƯU */}
                {loading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1120] pointer-events-none transition-opacity duration-500">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-4 border-[#0275FB]/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-[#0275FB] rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-sm font-black text-[#0275FB] uppercase tracking-widest animate-pulse">Đang kết nối không gian Yoolife...</p>
                    </div>
                )}

                {/* OVERLAY UI: THANH HUD CHUẨN CỦA TIMELENS ĐỂ ĐIỀU HƯỚNG */}
                <div className="relative z-40 pointer-events-auto">
                    <Tour360Hud
                        locationId={activeLocationId}
                        panoramas={[]}
                        activePanorama={undefined}
                        activePanoramaId={null}
                        activeInfoHotspots={[]}
                        viewMode="panorama"
                        immersive={immersive}
                        onSelectPanorama={() => {}}
                        onInfoHotspot={() => {}}
                        onOpenMap={() => {}}
                        onToggleImmersive={handleToggleImmersive}
                        menuOpen={menuOpen}
                        onToggleMenu={() => setMenuOpen((v) => !v)}
                    />
                </div>

            </main>
        </AppLayout>
    )
}