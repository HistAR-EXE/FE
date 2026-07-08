// src/pages/ModeSelectPage.tsx
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import type { AppMode } from '../shared/context/modeContext'
import { useAppMode } from '../shared/context/useAppMode'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { HERITAGE_SITE_GEO } from '../shared/config/heritageSites'
import { ExploreMapPanel } from '../features/explore/ExploreMapPanel'
import {
    findMergedByLocationId,
    mergeDestinations,
    mergedToMapLocations,
    type StaticDestination,
} from '../features/explore/destinationMerge'
import { locationsApi, type Location as HeritageLocation } from '../features/locations/api'
import { useToast } from '../shared/ui/toast/useToast'

// ============================================================================
// DỮ LIỆU BƯỚC 1: PHƯƠNG THỨC TRẢI NGHIỆM
// ============================================================================
const MODE_OPTIONS: {
    mode: AppMode
    icon: string
    badge: string
    title: string
    subtitle: string
    features: string[]
    accentColor: string
    borderHover: string
    glowHover: string
}[] = [
    {
        mode: 'online',
        icon: 'public',
        badge: 'Học Tập & Khám Phá Từ Xa',
        title: 'Không Gian Số Hóa Online',
        subtitle: 'Tối ưu cho lớp học trực quan và tự hành trình trải nghiệm tại nhà.',
        features: [
            'Tham quan không gian 3 chiều Tour 360° độ phân giải 4K',
            'Cổng thời gian Time Portal đối chiếu sự chuyển mình xưa & nay',
            'Trợ lý Lịch sử AI chuẩn RAG minh bạch 100% tài liệu trích dẫn',
        ],
        accentColor: 'text-[#fe951c]',
        borderHover: 'hover:border-[#fe951c]/80',
        glowHover: 'hover:shadow-[0_0_35px_rgba(254,149,28,0.2)]',
    },
    {
        mode: 'offline',
        icon: 'qr_code_scanner',
        badge: 'Đồng Hành Thực Địa O2O',
        title: 'Tương Tác Thực Địa Onsite',
        subtitle: 'Nâng cấp trải nghiệm tham quan trực tiếp tại bảo tàng và di tích.',
        features: [
            'Kích hoạt định vị GPS Geofencing & quét mã QR thực địa thông minh',
            'Mở khóa mô hình hiện vật AR 3D ẩn giấu ngay trước mắt',
            'Tích lũy điểm thưởng Check-in & chinh phục huy hiệu Hộ chiếu Di sản',
        ],
        accentColor: 'text-[#388cf1]',
        borderHover: 'hover:border-[#388cf1]/80',
        glowHover: 'hover:shadow-[0_0_35px_rgba(56,140,241,0.2)]',
    },
]

// ============================================================================
// DỮ LIỆU BƯỚC 2: CHÍNH XÁC 10 ĐIỂM ĐẾN QUỐC GIA THEO YÊU CẦU
// ============================================================================
type Region = 'all' | 'mien-bac' | 'mien-trung' | 'mien-nam'

const DEST_UI: Record<string, { desc: string; image: string; fallback: string; isReady: boolean }> = {
    [CU_CHI_LOCATION_ID]: {
        desc: 'Hệ thống phòng thủ ngầm 3 tầng huyền thoại, tái hiện sống động không gian chiến đấu và sinh hoạt lịch sử.',
        image: '/media/destinations/cu-chi.jpg',
        fallback: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
        isReady: true,
    },
    'den-hung-vuong': {
        desc: 'Nơi thờ cúng các Vua Hùng có công dựng nước, biểu tượng tâm linh và cội nguồn của muôn triệu người Việt Nam.',
        image: 'https://images.unsplash.com/photo-1599708153386-62bf3f0b2bd6?auto=format&fit=crop&w=800&q=80',
        fallback: 'https://images.unsplash.com/photo-1599708153386-62bf3f0b2bd6?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
    'van-mieu-quoc-tu-giam': {
        desc: 'Trường đại học đầu tiên của Việt Nam, biểu tượng truyền thống hiếu học và tôn sư trọng đạo nghìn năm.',
        image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
        fallback: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
    'hoang-thang-thang-long': {
        desc: 'Quần thể di tích hoàng gia gắn liền với lịch sử kinh đô Thăng Long - Hà Nội bắt đầu từ thời kỳ trước Thăng Long.',
        image: '/media/destinations/thang-long.jpg',
        fallback: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
    'co-do-hoa-lu': {
        desc: 'Kinh đô đầu tiên của nhà nước phong kiến trung ương tập quyền Việt Nam dưới triều Đinh, Tiền Lê.',
        image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',
        fallback: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
    'thanh-nha-ho': {
        desc: 'Kỳ quan kiến trúc đá độc nhất vô nhị tại Việt Nam thế kỷ 15, di sản văn hóa thế giới được UNESCO công nhận.',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        fallback: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
    'chua-thien-mu': {
        desc: 'Ngôi cổ tự linh thiêng và cổ kính bậc nhất xứ Huế nằm hiền hòa bên dòng sông Hương thơ mộng.',
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
        fallback: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
    'dai-noi-hue': {
        desc: 'Trung tâm hành chính và chính trị của triều đình nhà Nguyễn, hội tụ đỉnh cao nghệ thuật kiến trúc cung đình.',
        image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
        fallback: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
    'pho-co-hoi-an': {
        desc: 'Thương cảng sầm uất thế kỷ 16-17, lưu giữ trọn vẹn nét kiến trúc giao thoa Đông Tây trầm mặc rực rỡ.',
        image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80',
        fallback: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
    'ben-nha-rong': {
        desc: 'Nơi Bác Hồ ra đi tìm đường cứu nước năm 1911, tích hợp kho tư liệu giáo dục số hóa chuyên sâu.',
        image: '/media/destinations/ben-nha-rong.jpg',
        fallback: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
        isReady: false,
    },
}

const DESTINATIONS: StaticDestination[] = HERITAGE_SITE_GEO.map((site) => {
    const ui = DEST_UI[site.slug]
    return {
        id: site.slug,
        name: site.name,
        city: site.city,
        region: site.region,
        desc: ui.desc,
        image: ui.image,
        fallback: ui.fallback,
        isReady: ui.isReady,
        latitude: site.latitude,
        longitude: site.longitude,
        formattedAddress: site.formattedAddress,
        googleMapsUrl: site.googleMapsUrl,
    }
})

export function ModeSelectPage() {
    const { setMode } = useAppMode()
    const navigate = useNavigate()
    const location = useLocation()
    const { showToast } = useToast()

    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [selectedMode, setSelectedMode] = useState<AppMode>('online')
    const [selectedDestination, setSelectedDestination] = useState<string>(CU_CHI_LOCATION_ID)
    const [regionFilter, setRegionFilter] = useState<Region>('all')

    const [personaGoal, setPersonaGoal] = useState<'study' | 'travel' | 'research'>('study')
    const [sessionDuration, setSessionDuration] = useState<'15' | '30' | '60'>('30')
    const [aiTone, setAiTone] = useState<'heritage' | 'modern'>('heritage')
    const [apiLocations, setApiLocations] = useState<HeritageLocation[]>([])

    const pendingFrom = (location.state as { from?: string } | null)?.from

    useEffect(() => {
        locationsApi.list({ size: 100 })
            .then(setApiLocations)
            .catch(() => setApiLocations([]))
    }, [])

    const mergedDestinations = useMemo(
        () => mergeDestinations(DESTINATIONS, apiLocations),
        [apiLocations],
    )

    const mapLocations: HeritageLocation[] = useMemo(
        () => mergedToMapLocations(mergedDestinations),
        [mergedDestinations],
    )

    const filteredDestinations = useMemo(() => {
        if (regionFilter === 'all') return mergedDestinations
        return mergedDestinations.filter((d) => d.region === regionFilter)
    }, [mergedDestinations, regionFilter])

    const notifyDigitizing = useCallback((name: string) => {
        showToast({
            message: `Địa điểm "${name}" đang được số hóa, vui lòng quay lại sau.`,
            type: 'info',
        })
    }, [showToast])

    const selectDestination = useCallback((locationId: string) => {
        const dest = findMergedByLocationId(mergedDestinations, locationId)
        if (!dest) return false
        if (!dest.isReady) {
            notifyDigitizing(dest.name)
            return false
        }
        setSelectedDestination(dest.locationId)
        if (dest.region !== 'all') {
            setRegionFilter(dest.region)
        }
        return true
    }, [mergedDestinations, notifyDigitizing])

    const handleMapPinClick = useCallback((loc: HeritageLocation) => {
        const dest = findMergedByLocationId(mergedDestinations, loc.id)
        if (!dest) return

        const isCuChi = dest.locationId === CU_CHI_LOCATION_ID
        if (!selectDestination(dest.locationId)) return

        if (isCuChi) {
            setStep(3)
        }
    }, [mergedDestinations, selectDestination])

    const handleGoToStep2 = (mode: AppMode) => {
        setSelectedMode(mode)
        setStep(2)
    }

    const handleGoToStep3 = () => {
        setStep(3)
    }

    const [isLaunching, setIsLaunching] = useState(false)

    const handleLaunchJourney = async () => {
        setIsLaunching(true)
        setMode(selectedMode)

        localStorage.setItem('timelens_pref_goal', personaGoal)
        localStorage.setItem('timelens_pref_duration', sessionDuration)
        localStorage.setItem('timelens_pref_ai_tone', aiTone)

        try {
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')

            await fetch('/api/me/visit-sessions/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    locationId: selectedDestination,
                    mode: selectedMode,
                    personaGoal: personaGoal,
                    sessionDuration: sessionDuration,
                    aiTone: aiTone
                })
            })
        } catch (error) {
            console.warn("[TimeLens Notice] Chưa đồng bộ session với Backend, dùng chế độ Local:", error)
        } finally {
            setIsLaunching(false)
            const target = pendingFrom?.startsWith('/') && pendingFrom !== '/mode-select' ? pendingFrom : '/home'
            navigate(target, { replace: true })
        }
    }

    return (
        <AppLayout hideSideNav hideMobileChrome className="pb-0 md:pb-0 bg-[#0f1015] text-[#f8fafc] font-sans selection:bg-[#fe951c] selection:text-black min-h-screen">
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#fe951c]/10 rounded-full blur-[160px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#1a79e5]/10 rounded-full blur-[160px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#fe951c_1px,transparent_1px)] [background-size:28px_28px] opacity-10" />
            </div>

            <main className="relative z-10 min-h-screen flex flex-col justify-between px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
                <header className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-3">
                        <img src="/brand/icon-192.png" alt="TimeLens" className="w-10 h-10 rounded-full border border-[#fdb438]/60 object-cover shadow-md" />
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-white leading-none">TimeLens</h1>
                            <span className="text-[10px] font-bold text-[#fe951c] tracking-widest uppercase">by HistAR Team</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 bg-[#161824]/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/15 shadow-lg text-xs font-bold">
                        <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black ${step >= 1 ? 'bg-[#fe951c] text-black shadow-[0_0_12px_#fe951c]' : 'bg-white/10 text-gray-500'}`}>1</span>
                            <span className={step === 1 ? 'text-white font-extrabold' : 'text-gray-400'}>Phương Thức</span>
                        </div>
                        <span className="text-gray-600">/</span>
                        <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black ${step >= 2 ? 'bg-[#388cf1] text-white shadow-[0_0_12px_#388cf1]' : 'bg-white/10 text-gray-500'}`}>2</span>
                            <span className={step === 2 ? 'text-white font-extrabold' : 'text-gray-400'}>Điểm Đến</span>
                        </div>
                        <span className="text-gray-600">/</span>
                        <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black ${step === 3 ? 'bg-emerald-400 text-black shadow-[0_0_12px_#34d399]' : 'bg-white/10 text-gray-500'}`}>3</span>
                            <span className={step === 3 ? 'text-white font-extrabold' : 'text-gray-400'}>Cá Nhân Hóa</span>
                        </div>
                    </div>
                </header>

                <div className="my-auto py-8">
                    {/* BƯỚC 1: PHƯƠNG THỨC TRẢI NGHIỆM */}
                    {step === 1 && (
                        <div className="space-y-10 animate-[fadeInUp_0.35s_ease-out]">
                            <div className="text-center max-w-3xl mx-auto space-y-3">
                                <span className="text-xs font-black text-[#fe951c] tracking-widest uppercase">Bước 1 / 3: Xác lập phương thức tương tác</span>
                                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">Bạn Đang Khám Phá Từ Đâu?</h2>
                                <p className="text-sm sm:text-base text-gray-300 font-medium max-w-2xl mx-auto">Hệ thống tự động tối ưu hóa giao diện đồ họa, nội dung RAG AI và cơ chế tương tác WebAR phù hợp với không gian thực tế của bạn.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                                {MODE_OPTIONS.map((option) => (
                                    <div
                                        key={option.mode}
                                        onClick={() => handleGoToStep2(option.mode)}
                                        className={`p-8 rounded-3xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/15 transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden backdrop-blur-xl ${option.borderHover} ${option.glowHover}`}
                                    >
                                        <div className="space-y-6 relative z-10">
                                            <div className="flex items-center justify-between">
                                                <span className="px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-gray-200 uppercase tracking-wider">{option.badge}</span>
                                                <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${option.accentColor} group-hover:scale-110 transition-transform shadow-inner`}>
                                                    <MaterialIcon name={option.icon} className="text-3xl" />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white group-hover:text-[#fdb438] transition-colors">{option.title}</h3>
                                                <p className="text-sm text-gray-300 mt-2 font-medium leading-relaxed">{option.subtitle}</p>
                                            </div>
                                            <ul className="space-y-3 pt-4 border-t border-white/10">
                                                {option.features.map((feat, idx) => (
                                                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-200 font-medium">
                                                        <MaterialIcon name="check_circle" className={`text-lg shrink-0 mt-0.5 ${option.accentColor}`} />
                                                        <span>{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors relative z-10">
                                            <span>Chọn phương thức này</span>
                                            <MaterialIcon name="arrow_forward" className={`text-lg transform group-hover:translate-x-1 transition-transform ${option.accentColor}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* BƯỚC 2: CHỌN ĐIỂM ĐẾN KHÁM PHÁ (BẢN ĐỒ TƯƠNG TÁC TRÊN CÙNG) */}
                    {step === 2 && (
                        <div className="space-y-10 animate-[fadeInUp_0.35s_ease-out]">
                            <div className="text-center max-w-3xl mx-auto space-y-3">
                                <span className="text-xs font-black text-[#388cf1] tracking-widest uppercase flex items-center justify-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#388cf1] animate-ping" />
                                    Bước 2 / 3: Bản Đồ Di Sản Số Hóa Quốc Gia
                                </span>
                                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Chọn Điểm Đến Khám Phá</h2>
                                <p className="text-sm sm:text-base text-gray-300 font-medium max-w-2xl mx-auto">
                                    Tương tác trực tiếp trên bản đồ 3D/Vệ tinh bên dưới hoặc chọn nhanh trong danh sách. Dữ liệu thực tế ảo RAG AI đầy đủ nhất hiện sẵn sàng tại <strong className="text-[#fdb438]">Địa Đạo Củ Chi</strong>.
                                </p>
                            </div>

                            {/* KHỐI BẢN ĐỒ HERO SIÊU THỰC TRÊN CÙNG */}
                            <div className="relative rounded-3xl p-1 bg-gradient-to-r from-[#fe951c]/40 via-[#388cf1]/40 to-[#fe951c]/40 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                                <div className="h-[460px] sm:h-[540px] w-full rounded-[22px] overflow-hidden relative bg-[#0b1628]">
                                    <ExploreMapPanel
                                        locations={mapLocations}
                                        selectedLocationId={selectedDestination}
                                        digitizationLock
                                        onLockedLocationClick={(loc) => notifyDigitizing(loc.name)}
                                        onPinClick={handleMapPinClick}
                                        className="h-full w-full border-0 rounded-none"
                                    />
                                    <div className="absolute top-4 right-4 z-[500] hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 pointer-events-none">
                                        <span className="text-xs font-black text-[#fdb438]">3D GIS MAPPING</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* BỘ LỌC VÙNG MIỀN */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#161824] p-4 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                    <MaterialIcon name="filter_list" className="text-base text-[#fe951c]" />
                                    <span>Lọc theo khu vực:</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { id: 'all', label: 'Tất Cả Điểm Đến' },
                                        { id: 'mien-bac', label: 'Miền Bắc' },
                                        { id: 'mien-trung', label: 'Miền Trung' },
                                        { id: 'mien-nam', label: 'Miền Nam' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setRegionFilter(tab.id as Region)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                regionFilter === tab.id
                                                    ? 'bg-[#fe951c] text-black shadow-md scale-105'
                                                    : 'bg-white/5 border border-white/15 text-gray-300 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* DANH SÁCH 10 DI TÍCH BÊN DƯỚI */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredDestinations.map((dest) => {
                                    const isSelected = selectedDestination === dest.locationId
                                    return (
                                        <div
                                            key={dest.locationId}
                                            onClick={() => {
                                                if (!dest.isReady) {
                                                    notifyDigitizing(dest.name)
                                                    return
                                                }
                                                setSelectedDestination(dest.locationId)
                                            }}
                                            className={`rounded-3xl overflow-hidden bg-white/[0.04] border transition-all duration-300 flex flex-col justify-between backdrop-blur-md ${
                                                !dest.isReady
                                                    ? 'opacity-50 border-white/5 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'border-[#fe951c] shadow-[0_0_35px_rgba(254,149,28,0.35)] bg-white/[0.09] scale-[1.02] cursor-pointer ring-1 ring-[#fe951c]'
                                                        : 'border-white/15 hover:border-white/30 cursor-pointer hover:bg-white/[0.06]'
                                            }`}
                                        >
                                            <div className="h-48 relative overflow-hidden bg-[#0f1015]">
                                                <img
                                                    src={dest.image}
                                                    alt={dest.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                                                    onError={(e) => { e.currentTarget.src = dest.fallback }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#141620] via-black/40 to-transparent" />
                                                {dest.isReady ? (
                                                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-500 text-black font-black text-[10px] uppercase shadow-md">
                                                        SẴN SÀNG AR RAG
                                                    </span>
                                                ) : (
                                                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-gray-400 font-bold text-[10px] uppercase border border-white/10">
                                                        SẮP RA MẮT
                                                    </span>
                                                )}
                                                {isSelected && dest.isReady && (
                                                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#fe951c] text-black flex items-center justify-center shadow-lg animate-bounce">
                                                        <MaterialIcon name="check" className="text-lg font-black" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                                                <div>
                                                    <p className="text-[11px] font-bold text-[#388cf1] uppercase tracking-wide flex items-center gap-1">
                                                        <MaterialIcon name="place" className="text-sm" /> {dest.city}
                                                    </p>
                                                    <h3 className="text-xl font-black text-white mt-1 leading-snug">{dest.name}</h3>
                                                    <p className="text-xs text-gray-300 mt-2 leading-relaxed font-medium line-clamp-2">{dest.desc}</p>
                                                </div>

                                                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                                                    {dest.isReady ? (
                                                        <span className={isSelected ? 'text-[#fdb438]' : 'text-gray-400'}>{isSelected ? '✦ Đang chọn di tích này' : 'Nhấp chọn điểm đến'}</span>
                                                    ) : (
                                                        <span className="text-gray-500 flex items-center gap-1"><MaterialIcon name="lock" className="text-sm" /> Đang số hóa 3D</span>
                                                    )}
                                                </div>
                                                {dest.formattedAddress && (
                                                    <p className="text-[10px] text-gray-500 line-clamp-2 flex items-start gap-1 pt-1">
                                                        <MaterialIcon name="location_on" className="text-xs shrink-0 mt-0.5" />
                                                        {dest.formattedAddress}
                                                    </p>
                                                )}
                                                {dest.googleMapsUrl && (
                                                    <a
                                                        href={dest.googleMapsUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[10px] text-[#388cf1] hover:underline pt-1 inline-flex items-center gap-1"
                                                    >
                                                        <MaterialIcon name="map" className="text-xs" />
                                                        Mở trên Google Maps
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* NÚT ĐIỀU HƯỚNG BƯỚC 2 */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/20 hover:bg-white/10 text-gray-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <MaterialIcon name="arrow_back" className="text-base" />
                                    <span>Quay lại</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleGoToStep3}
                                    className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-[#388cf1] via-[#1a79e5] to-[#388cf1] hover:scale-105 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(56,140,241,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span>Tiếp Tục</span>
                                    <MaterialIcon name="arrow_forward" className="text-lg font-bold" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* BƯỚC 3: THIẾT LẬP CÁ NHÂN HÓA */}
                    {step === 3 && (
                        <div className="space-y-10 animate-[fadeInUp_0.35s_ease-out] max-w-3xl mx-auto">
                            <div className="text-center space-y-3">
                                <span className="text-xs font-black text-emerald-400 tracking-widest uppercase">Bước 3 / 3: Cá nhân hóa hành trình</span>
                                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Tối Ưu Hóa Trợ Lý AI</h2>
                                <p className="text-sm sm:text-base text-gray-300 font-medium">Thiết lập mục tiêu giúp Trợ lý Lịch sử AI điều chỉnh độ sâu kiến thức và gợi ý lộ trình Hotspot phù hợp nhất với bạn.</p>
                            </div>

                            <div className="space-y-8 bg-white/[0.03] border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-[#fdb438] uppercase tracking-wider block">1. Mục đích trải nghiệm chính của bạn là gì?</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            { id: 'study', title: 'Học Tập & Làm Bài', desc: 'Nhận điểm XP, trả lời câu hỏi và chinh phục huy hiệu.' },
                                            { id: 'travel', title: 'Khám Phá & Du Lịch', desc: 'Nghe kể chuyện lịch sử nhẹ nhàng, chụp ảnh kỷ niệm.' },
                                            { id: 'research', title: 'Nghiên Cứu Chuyên Sâu', desc: 'Truy xuất sử liệu chi tiết, phân tích bản đồ chiến thuật.' },
                                        ].map((g) => (
                                            <div
                                                key={g.id}
                                                onClick={() => setPersonaGoal(g.id as typeof personaGoal)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${personaGoal === g.id ? 'bg-[#fe951c]/15 border-[#fe951c] text-white shadow-[0_0_15px_rgba(254,149,28,0.2)]' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'}`}
                                            >
                                                <p className="font-black text-sm">{g.title}</p>
                                                <p className="text-[11px] text-gray-400 mt-1">{g.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-[#388cf1] uppercase tracking-wider block">2. Thời lượng dự kiến cho mỗi phiên tham quan?</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: '15', label: '15 Phút', sub: 'Khám phá nhanh' },
                                            { id: '30', label: '30 Phút', sub: 'Chuẩn tiêu chuẩn' },
                                            { id: '60', label: '60+ Phút', sub: 'Trải nghiệm sâu' },
                                        ].map((t) => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSessionDuration(t.id as typeof sessionDuration)}
                                                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${sessionDuration === t.id ? 'bg-[#388cf1]/20 border-[#388cf1] text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}
                                            >
                                                <p className="font-black text-base">{t.label}</p>
                                                <p className="text-[10px] text-gray-400">{t.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">3. Phong cách giao tiếp của Trợ lý AI?</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { id: 'heritage', title: 'Trầm Ấm & Truyền Cảm Hứng', desc: 'Nhập vai nhân vật lịch sử xưa (VD: Chị Năm du kích).' },
                                            { id: 'modern', title: 'Hiện Đại & Ngắn Gọn', desc: 'Trình bày súc tích, gạch đầu dòng chuẩn giáo dục RAG.' },
                                        ].map((tone) => (
                                            <div
                                                key={tone.id}
                                                onClick={() => setAiTone(tone.id as typeof aiTone)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${aiTone === tone.id ? 'bg-emerald-500/15 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}
                                            >
                                                <p className="font-black text-sm">{tone.title}</p>
                                                <p className="text-[11px] text-gray-400 mt-1">{tone.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/20 hover:bg-white/10 text-gray-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <MaterialIcon name="arrow_back" className="text-base" />
                                    <span>Quay lại</span>
                                </button>

                                <button
                                    type="button"
                                    disabled={isLaunching}
                                    onClick={handleLaunchJourney}
                                    className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-[#fe951c] via-[#fdb438] to-[#e07d0b] hover:scale-105 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(254,149,28,0.6)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLaunching ? (
                                        <>
                                            <MaterialIcon name="sync" className="text-xl font-bold animate-spin" />
                                            <span>Đang Khởi Tạo Trợ Lý AI...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Hoàn Tất</span>
                                            <MaterialIcon name="rocket_launch" className="text-xl font-bold" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="w-full border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 font-medium gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">TimeLens Heritage Platform</span>
                        <span>—</span>
                        <span>Giải pháp EdTech Số hóa Di sản thế hệ mới</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            RAG AI & WEBAR READY
                        </span>
                        <span>Bảo mật JWT 256-bit</span>
                    </div>
                </footer>
            </main>
        </AppLayout>
    )
}