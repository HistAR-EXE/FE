// src/pages/Tour360Page.tsx
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Tour360Hud } from '../components/panorama/Tour360Hud'

const CU_CHI_LOCATION_ID = '11111111-1111-1111-1111-111111111111'
const EXTERNAL_360_URL = 'https://map3d.visithcmc.vn/?startscene=scene_cuchi_view2'

// TỐI ƯU HIỆU NĂNG 1: Dùng React.memo để cô lập iFrame.
// Đảm bảo iFrame chỉ load ĐÚNG 1 LẦN duy nhất, không bị re-render (gây đen màn hình) khi thao tác với UI bên ngoài.
const OptimizedExternalTour = React.memo(() => {
    return (
        <iframe
            src={EXTERNAL_360_URL}
            className="w-full h-full border-0"
            allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
            loading="lazy" // Tối ưu: Chỉ tải khi hiển thị trên màn hình
            referrerPolicy="no-referrer" // Tối ưu: Giảm thiểu việc bị Server gốc block do khác domain
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

    // TỐI ƯU HIỆU NĂNG 2 & CHE LOGO: Giữ màn hình Loading của TimeLens trong 4.5 giây
    // để đợi iFrame bên dưới chạy xong phần logo thương hiệu của họ.
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 10000)
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
                {/* overflow-hidden: Cắt bỏ mọi thứ tràn ra ngoài khung này */}
                <div className="absolute inset-0 z-10 bg-black overflow-hidden">
                    {/*
                        Thủ thuật CSS mở rộng:
                        - Đẩy khối sang trái 60px (-left-[60px]) để giấu menu hồng bên trái.
                        - Tăng chiều rộng thêm 140px (60px trái + 80px phải) bằng w-[calc(100%+140px)]
                          để đẩy luôn cụm nút công cụ bên phải ra khỏi màn hình hiển thị.
                    */}
                    <div className="absolute top-0 bottom-0 -left-[60px] w-[calc(100%+140px)]">
                        <OptimizedExternalTour />
                    </div>
                </div>

                {/* TRẠNG THÁI LOADING UI TỐI ƯU (Nằm đè lên iFrame trong lúc chờ) */}
                {loading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1120] pointer-events-none transition-opacity duration-500">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-4 border-[#0275FB]/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-[#0275FB] rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-sm font-black text-[#0275FB] uppercase tracking-widest animate-pulse">Đang kết nối cổng không gian...</p>
                        {/*<p className="text-xs font-medium text-gray-500 mt-2">Quá trình này phụ thuộc vào tốc độ máy chủ đối tác.</p>*/}
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