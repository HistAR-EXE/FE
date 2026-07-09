// src/pages/ArtifactsPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { collectionApi, type Artifact } from '../features/collection/api'
import { recordDiscoveryEngagement } from '../features/gamification/discoveryRouting'
import { showDiscoveryRecordError } from '../features/gamification/discoveryEngagementToast'
import { notifyEngagementOutcome } from '../features/gamification/handleEngagement'
import { analyticsApi } from '../features/analytics/api'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { useVisitSessionForLocation, useVisitSession } from '../features/visit/VisitSessionProvider'
import { buildArUrl } from '../features/ar/arDeepLink'
import { getArSceneByUnlockKey } from '../features/ar/cuChiArScenes'
import { useAppMode } from '../shared/context/useAppMode'
import { resolveArtifactImageFallback, resolveArtifactImageSrc } from '../shared/media/resolveMedia'
import { SmartImage } from '../shared/ui/SmartImage'

type StatusFilter = 'all' | 'unlocked' | 'locked'

// ==========================================
// VÒNG TRÒN NĂNG LƯỢNG SƯU TẬP (HUD THU GỌN)
// ==========================================
function CollectionProgress({ collected, total }: { collected: number; total: number }) {
    const pct = total > 0 ? Math.round((collected / total) * 100) : 0
    const r = 24
    const c = 2 * Math.PI * r
    const offset = c - (pct / 100) * c

    return (
        <div className="flex items-center gap-4 bg-[#161824]/95 border border-white/10 pl-3 pr-6 py-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl relative z-20">
            <div className="relative w-[56px] h-[56px] shrink-0 bg-[#0f1015] rounded-full flex items-center justify-center shadow-inner">
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(254,149,28,0.6)]" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle cx="28" cy="28" r={r} fill="none" stroke="url(#artifactProgress)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
                    <defs>
                        <linearGradient id="artifactProgress" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fe951c" />
                            <stop offset="100%" stopColor="#fdb438" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-black text-sm text-white drop-shadow-md leading-none">{pct}%</span>
                </div>
            </div>
            <div>
                <p className="font-black text-sm text-white uppercase tracking-widest flex items-center gap-2 mb-1.5">
                    <MaterialIcon name="inventory_2" className="text-[#fdb438] text-lg" /> KHO DỮ LIỆU
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Đã thu thập: <strong className="text-[#fdb438] text-xs mx-1">{collected} / {total}</strong> Kỷ vật
                </p>
            </div>
        </div>
    )
}

export function ArtifactsPage() {
    const { isAuthenticated, user } = useAuth()
    const { mode } = useAppMode()
    const { showToast } = useToast()
    const { applyEngagement } = useUserProgress()
    const recordedKeys = useRef(new Set<string>())

    const locationId = CU_CHI_LOCATION_ID

    const [artifacts, setArtifacts] = useState<Artifact[]>([])
    const [collected, setCollected] = useState(0)
    const [total, setTotal] = useState(0)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [selected, setSelected] = useState<Artifact | null>(null)

    useVisitSessionForLocation(locationId, isAuthenticated)
    const { getSessionId } = useVisitSession()
    const visitSessionId = getSessionId(locationId)

    useEffect(() => {
        const loadArtifacts = async () => {
            try {
                if (isAuthenticated) {
                    const mine = await collectionApi.mine(locationId)
                    setArtifacts(mine.items)
                    setCollected(mine.collected)
                    setTotal(mine.total)
                } else {
                    const list = await collectionApi.catalog(locationId)
                    setArtifacts(list.map((a) => ({ ...a, unlocked: false })))
                    setCollected(0)
                    setTotal(list.length)
                }
            } catch {
                // Fallback
            }
        }
        loadArtifacts()
    }, [isAuthenticated, locationId])

    const recordArtifactDiscovery = useCallback(
        (unlockKey: string | undefined) => {
            if (!isAuthenticated || !unlockKey?.startsWith('artifact:')) return
            if (recordedKeys.current.has(unlockKey)) return
            recordedKeys.current.add(unlockKey)
            void recordDiscoveryEngagement({
                recordKey: unlockKey, locationId, source: 'artifact',
                onSuccess: (response) => {
                    notifyEngagementOutcome(response, showToast, applyEngagement)
                    void analyticsApi.recordEvent({
                        locationId, visitSessionId, eventType: 'ARTIFACT_VIEWED', eventKey: unlockKey, source: 'artifact'
                    })
                },
                onError: () => showDiscoveryRecordError(showToast, { role: user?.role }),
            })
        },
        [isAuthenticated, locationId, visitSessionId, showToast, applyEngagement],
    )

    const filteredArtifacts = useMemo(
        () => artifacts.filter((a) => {
            if (statusFilter === 'unlocked' && !a.unlocked) return false
            if (statusFilter === 'locked' && a.unlocked) return false
            return true
        }),
        [artifacts, statusFilter]
    )

    const openArtifactDetail = useCallback((artifact: Artifact) => {
        setSelected(artifact)
        recordArtifactDiscovery(artifact.unlockKey)
    }, [recordArtifactDiscovery])

    return (
        <AppLayout
            activeBorder="right"
            mobileBackTo="/explore"
            mobileTitle="Kỷ Vật"
            topNav={<SimpleTopNav title="Hồ Sơ Kỷ Vật" backTo="/explore" backLabel="Khám phá" />}
            className="bg-[#0B1120] min-h-screen text-white font-sans selection:bg-[#fe951c] selection:text-black"
        >
            <main className="mt-14 md:mt-16 pb-24">

                {/* ========================================= */}
                {/* HERO BANNER - AR SCANNER & INSTRUCTIONS */}
                {/* ========================================= */}
                <section className="relative overflow-hidden border-b border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#0B1120] pt-0 pb-8 md:pb-12">
                    <div className="absolute inset-0 bg-[url('/media/grid.svg')] opacity-10 pointer-events-none" />

                    {/* Hào quang Ambient Lighting */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1a79e5]/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#fe951c]/10 rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16 z-10 pt-2 lg:pt-4">

                        {/* ===================================== */}
                        {/* KHỐI TRÁI: TEXT & HƯỚNG DẪN CHI TIẾT */}
                        {/* ===================================== */}
                        <div className="w-full lg:w-[55%] flex flex-col justify-start pt-2 lg:pt-4">

                            <div className="flex items-center gap-3 mb-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#fdb438] animate-pulse shadow-[0_0_15px_#fe951c]" />
                                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#fdb438]">
                                    HỆ THỐNG TRUY VẾT DI SẢN
                                </p>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-[3.2rem] xl:text-[3.6rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#fe951c] via-[#fff2a1] to-[#388cf1] tracking-tighter leading-tight mb-4 whitespace-nowrap pt-3 pb-2">
                                KHO LƯU TRỮ CỔ VẬT
                            </h1>

                            <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed mb-8 max-w-xl">
                                Sử dụng <strong className="text-white">Ống Kính AR</strong> tại hiện trường hoặc <strong className="text-[#388cf1]">Trinh sát số</strong> từ xa để quét không gian. Phục dựng các di vật bị thất lạc và mở khóa dòng thời gian Củ Chi.
                            </p>

                            {/* Tính năng / How it works */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <div className="w-10 h-10 rounded-full bg-[#fe951c]/20 border border-[#fe951c]/40 flex items-center justify-center mb-3">
                                        <MaterialIcon name="document_scanner" className="text-[#fdb438] text-lg" />
                                    </div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">QUÉT AR THỰC ĐỊA</h4>
                                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed">Hướng Camera vào khu vực trưng bày tại Củ Chi để hệ thống tự động bóc tách và thu thập mô hình 3D.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <div className="w-10 h-10 rounded-full bg-[#388cf1]/20 border border-[#388cf1]/40 flex items-center justify-center mb-3">
                                        <MaterialIcon name="explore" className="text-cyan-400 text-lg" />
                                    </div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">TRINH SÁT ONLINE</h4>
                                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed">Tìm Hotspot ẩn trong Tour 360°, so sánh Time Portal và Thẩm vấn AI Đại sứ để lấy manh mối.</p>
                                </div>
                            </div>
                        </div>

                        {/* ===================================== */}
                        {/* KHỐI PHẢI: MÔ HÌNH 3D CAMERA AR BẰNG CSS */}
                        {/* ===================================== */}
                        <div className="w-full lg:w-[45%] relative h-[260px] md:h-[300px] flex items-center justify-center shrink-0 mt-10 lg:mt-12">

                            {/* --- ỐNG KÍNH CAMERA AR THU NHỎ --- */}
                            <div className="relative w-[220px] h-[220px] md:w-[260px] md:h-[260px] flex items-center justify-center transform hover:scale-105 transition-transform duration-700">

                                {/* Vòng Radar sóng âm (Ping) */}
                                <div className="absolute inset-[-30px] rounded-full border border-[#388cf1]/30 animate-[ping_4s_linear_infinite]" />

                                {/* Tia quét sáng (Radar Sweep) */}
                                <div className="absolute inset-[-15px] rounded-full bg-[conic-gradient(from_0deg,transparent_70%,rgba(56,140,241,0.5)_100%)] animate-[spin_3s_linear_infinite] rounded-full" />

                                {/* Khung ngắm bên ngoài (Dashed Orbit) */}
                                <div className="absolute inset-[-4px] rounded-full border-[2px] border-dashed border-[#1a79e5]/40 animate-[spin_30s_linear_infinite_reverse]" />

                                {/* KHỐI VỎ CAMERA CHÍNH */}
                                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#1b1e2c] to-[#0B1120] border-[3px] border-[#161824] shadow-[0_20px_40px_rgba(0,0,0,0.9),inset_0_5px_15px_rgba(255,255,255,0.1)] flex items-center justify-center">

                                    {/* Viền Kim Loại 1 */}
                                    <div className="absolute inset-4 rounded-full border-t border-b border-gray-600 shadow-inner bg-gradient-to-tr from-gray-900 to-gray-800" />

                                    {/* Viền Kim Loại 2 */}
                                    <div className="absolute inset-7 rounded-full border-[4px] border-[#0a0f18] shadow-[0_0_15px_rgba(0,0,0,0.8)_inset]" />

                                    {/* MẶT KÍNH ỐNG KÍNH (Lens) */}
                                    <div className="absolute inset-9 rounded-full bg-gradient-to-br from-[#050814] to-[#01040a] border border-[#388cf1]/30 overflow-hidden shadow-[inset_0_0_30px_rgba(56,140,241,0.2)] flex items-center justify-center">

                                        {/* Reflection mặt kính cong (Glare) */}
                                        <div className="absolute top-1 left-4 w-[120%] h-8 bg-gradient-to-b from-white/10 to-transparent -rotate-45 transform -translate-x-4 blur-[1px]" />
                                        <div className="absolute bottom-2 right-4 w-10 h-5 bg-[#388cf1]/20 rounded-full -rotate-45 blur-md" />

                                        {/* Lưới tọa độ mục tiêu trong kính */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                            <div className="w-full h-[1px] bg-[#388cf1]" />
                                            <div className="absolute h-full w-[1px] bg-[#388cf1]" />
                                            <div className="absolute w-8 h-8 border border-[#fdb438] rounded-full" />
                                        </div>

                                        {/* MẮT CẢM BIẾN LƯỢNG TỬ (Core Glow) */}
                                        <div className="relative z-10 w-12 h-12 bg-gradient-to-br from-[#fe951c] to-[#d97706] rounded-full shadow-[0_0_30px_#fe951c,inset_0_0_10px_#000] border-2 border-[#fff2a1] flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]">
                                            <div className="w-6 h-6 bg-black/40 rounded-full blur-[2px]" />
                                            <div className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]" />
                                        </div>
                                    </div>

                                    {/* Đèn chỉ báo viền máy */}
                                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_6px_#ef4444] animate-pulse" />
                                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#388cf1] rounded-full shadow-[0_0_5px_#388cf1]" />
                                </div>

                                {/* VỆ TINH NỔI */}
                                <div className="absolute top-[-5px] right-[-10px] animate-[bounce_3s_ease-in-out_infinite]">
                                    <div className="w-10 h-10 rounded-xl bg-[#0B1120]/80 border border-[#388cf1] shadow-[0_0_15px_rgba(56,140,241,0.5)] backdrop-blur-md flex items-center justify-center transform rotate-12">
                                        <MaterialIcon name="military_tech" className="text-[#388cf1] text-lg drop-shadow-[0_0_5px_#388cf1]" />
                                    </div>
                                </div>

                                <div className="absolute bottom-[10px] left-[-10px] animate-[bounce_4s_ease-in-out_infinite_reverse]">
                                    <div className="w-8 h-8 rounded-lg bg-[#0B1120]/80 border border-[#fe951c] shadow-[0_0_15px_rgba(254,149,28,0.5)] backdrop-blur-md flex items-center justify-center transform -rotate-12">
                                        <MaterialIcon name="diamond" className="text-[#fe951c] text-sm drop-shadow-[0_0_5px_#fe951c]" />
                                    </div>
                                </div>
                            </div>

                            {/* --- BẢNG HUD TIẾN ĐỘ TRÔI NỔI --- */}
                            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 z-30 transform hover:scale-105 transition-transform w-max">
                                <CollectionProgress collected={collected} total={total} />
                            </div>
                        </div>

                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">

                    {!isAuthenticated && (
                        <div className="mb-10 bg-gradient-to-r from-[#1a79e5]/20 to-transparent border border-[#388cf1]/40 rounded-2xl p-5 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                            <MaterialIcon name="shield_locked" className="text-[#388cf1] text-3xl shrink-0" />
                            <div>
                                <p className="font-black text-white text-sm tracking-wider uppercase mb-1">Chế độ Khách (Guest Mode)</p>
                                <p className="text-sm text-gray-300 font-medium">Dữ liệu thu thập sẽ không được lưu trữ vĩnh viễn. Hãy <Link to="/login" className="text-[#fdb438] underline font-black">Đăng nhập</Link> để đồng bộ Kho lưu trữ của bạn.</p>
                            </div>
                        </div>
                    )}

                    {/* ========================================= */}
                    {/* BỘ LỌC TỐI GIẢN (SANG TRỌNG) */}
                    {/* Đã giảm khoảng cách top (mt-10) để gần Banner hơn */}
                    {/* ========================================= */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 pb-6 mb-10">
                        <div className="flex gap-2 p-1.5 bg-[#161b29] rounded-2xl border border-white/5 shadow-inner">
                            {(['all', 'unlocked', 'locked'] as const).map((f) => {
                                const isActive = statusFilter === f;
                                let label = 'TẤT CẢ';
                                if(f === 'unlocked') label = 'ĐÃ GIẢI MÃ';
                                if(f === 'locked') label = 'BỊ KHÓA';

                                return (
                                    <button
                                        key={f}
                                        onClick={() => setStatusFilter(f)}
                                        className={`px-6 md:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.15em] transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-gradient-to-r from-[#1a79e5] to-[#388cf1] text-white shadow-[0_0_20px_rgba(56,140,241,0.5)]'
                                                : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-5 py-3 bg-[#161b29] rounded-2xl border border-white/5 shadow-sm flex items-center gap-2">
                            <MaterialIcon name="dataset" className="text-[#fdb438] text-lg" />
                            SỐ LƯỢNG TÌM THẤY: <span className="text-white text-base mx-1">{filteredArtifacts.length}</span>
                        </div>
                    </div>

                    {/* ========================================= */}
                    {/* LƯỚI THẺ CỔ VẬT (POKÉDEX GRID) */}
                    {/* ========================================= */}
                    {filteredArtifacts.length === 0 ? (
                        <div className="text-center py-32 border border-dashed border-white/10 rounded-[3rem] bg-[#161824]/40 backdrop-blur-xl shadow-2xl">
                            <div className="w-24 h-24 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                                <MaterialIcon name="policy" className="text-6xl text-gray-600" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Không Có Dữ Liệu</h3>
                            <p className="text-base text-gray-500 font-medium">Hồ sơ không khớp với phân loại hiện tại. Đề nghị thay đổi tùy chọn.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredArtifacts.map((artifact) => {
                                const isSelected = selected?.id === artifact.id

                                // === THỂ LOẠI: BỊ KHÓA (BLUEPRINT SCI-FI) ===
                                if (!artifact.unlocked) {
                                    return (
                                        <button
                                            key={artifact.id}
                                            onClick={() => openArtifactDetail(artifact)}
                                            className={`group text-left rounded-[2rem] overflow-hidden border bg-[#0B1120] transition-all duration-500 hover:shadow-[0_15px_40px_rgba(56,140,241,0.2)] cursor-pointer h-full flex flex-col ${isSelected ? 'border-[#388cf1] ring-2 ring-[#388cf1]' : 'border-[#388cf1]/20 hover:border-[#388cf1]/60'}`}
                                        >
                                            <div className="aspect-[4/3] w-full relative bg-[#0B1120] flex items-center justify-center overflow-hidden">
                                                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(56,140,241,0.1)_50%)] bg-[length:100%_4px] z-10 pointer-events-none" />
                                                <div className="absolute inset-0 bg-[url('/media/grid.svg')] opacity-30 z-10" />

                                                <img
                                                    src={resolveArtifactImageSrc(artifact.imageUrl, artifact.unlockKey) || resolveArtifactImageFallback(artifact.unlockKey)}
                                                    alt="Locked"
                                                    className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 blur-[5px] mix-blend-screen sepia hue-rotate-190 saturate-200"
                                                />

                                                <div className="relative z-20 w-16 h-16 rounded-full bg-[#1a79e5]/10 border border-[#388cf1]/40 flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(56,140,241,0.3)] group-hover:scale-110 transition-transform">
                                                    <MaterialIcon name="lock" className="text-3xl text-[#388cf1]" />
                                                </div>
                                            </div>
                                            <div className="p-6 border-t border-[#388cf1]/20 bg-[#0B1120] flex-1 flex flex-col justify-center">
                                                <h3 className="font-mono text-base font-bold text-[#388cf1] uppercase tracking-[0.2em] line-clamp-1 mb-2">
                                                    [ ENCRYPTED DATA ]
                                                </h3>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> YÊU CẦU GIẢI MÃ
                                                </p>
                                            </div>
                                        </button>
                                    )
                                }

                                // === THỂ LOẠI: ĐÃ MỞ KHÓA (RỰC RỠ SANG TRỌNG) ===
                                return (
                                    <button
                                        key={artifact.id}
                                        onClick={() => openArtifactDetail(artifact)}
                                        className={`group text-left rounded-[2rem] overflow-hidden border transition-all duration-500 bg-[#161824] hover:-translate-y-2 cursor-pointer h-full flex flex-col ${
                                            isSelected ? `ring-2 ring-[#fe951c] border-[#fe951c]` : `border-white/10 hover:border-[#fe951c]/50 hover:shadow-[0_20px_50px_rgba(254,149,28,0.25)]`
                                        }`}
                                    >
                                        <div className="aspect-[4/3] w-full relative overflow-hidden bg-black">
                                            <SmartImage
                                                src={resolveArtifactImageSrc(artifact.imageUrl, artifact.unlockKey)}
                                                fallback={resolveArtifactImageFallback(artifact.unlockKey)}
                                                alt={artifact.name}
                                                fill
                                                className="transition-transform duration-1000 group-hover:scale-110 object-cover opacity-90 group-hover:opacity-100"
                                            />
                                            <div className={`absolute inset-0 bg-gradient-to-t from-[#161824] via-[#161824]/10 to-transparent opacity-90 group-hover:opacity-60 transition-opacity`} />

                                            <div className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_#10b981]">
                                                <MaterialIcon name="check" className="text-lg font-black text-black" />
                                            </div>
                                        </div>

                                        <div className="p-6 border-t border-white/5 bg-[#161824] flex-1 flex flex-col justify-center relative overflow-hidden">
                                            <div className={`absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#fe951c]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                                            <h3 className="font-black text-xl text-white leading-snug line-clamp-2 relative z-10 group-hover:text-[#fdb438] transition-colors">
                                                {artifact.name}
                                            </h3>
                                            <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-[0.2em] font-black relative z-10 flex items-center gap-1.5">
                                                <MaterialIcon name="place" className="text-[14px] text-[#fe951c]" /> ĐỊA ĐẠO CỦ CHI
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ========================================= */}
                {/* MODAL CHI TIẾT CỔ VẬT (ENCRYPTED DOSSIER) */}
                {/* ========================================= */}
                {selected && (
                    <div
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-xl transition-all"
                        onClick={() => setSelected(null)}
                        role="presentation"
                    >
                        <div
                            className="w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 bg-[#0B1120] shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col animate-[fadeInUp_0.3s_ease-out]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={`h-1.5 w-full bg-gradient-to-r ${selected.unlocked ? 'from-[#fe951c] via-[#fdb438] to-[#fe951c]' : 'from-[#1a79e5] to-[#388cf1]'} shrink-0`} />

                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                <div className="flex flex-col md:flex-row h-full">

                                    <div className="w-full md:w-[45%] h-72 md:h-auto relative shrink-0 bg-[#050810]">
                                        {selected.unlocked ? (
                                            <>
                                                <SmartImage
                                                    src={resolveArtifactImageSrc(selected.imageUrl, selected.unlockKey)}
                                                    fallback={resolveArtifactImageFallback(selected.unlockKey)}
                                                    alt={selected.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                                <div className="absolute inset-4 border border-white/20 pointer-events-none mix-blend-overlay rounded-xl" />
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 bg-[#0a1526] flex items-center justify-center flex-col p-6 text-center">
                                                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(56,140,241,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />
                                                <div className="w-32 h-32 rounded-full bg-[#1a79e5]/10 border border-[#388cf1]/40 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(56,140,241,0.4)] animate-pulse relative z-10">
                                                    <MaterialIcon name="lock" className="text-6xl text-[#388cf1]" />
                                                </div>
                                                <p className="font-mono text-[#388cf1] text-xl font-bold tracking-[0.4em] uppercase relative z-10">CLASSIFIED</p>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setSelected(null)}
                                            className="absolute top-4 right-4 md:hidden w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-md z-50"
                                        >
                                            <MaterialIcon name="close" className="text-white text-2xl" />
                                        </button>
                                    </div>

                                    <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col">

                                        <div className="flex items-start justify-between gap-4 mb-8">
                                            <div>
                                                {selected.unlocked && (
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 shadow-sm">
                                                        TÀI LIỆU SỐ <span className="text-white">#{selected.id.slice(0, 6)}</span>
                                                    </span>
                                                )}
                                                <h2 className={`text-4xl md:text-5xl font-black leading-tight tracking-tighter ${selected.unlocked ? 'text-white' : 'text-[#388cf1] font-mono drop-shadow-[0_0_10px_#388cf1]'}`}>
                                                    {selected.unlocked ? selected.name : 'DỮ LIỆU BỊ MÃ HÓA'}
                                                </h2>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelected(null)}
                                                className="hidden md:flex w-12 h-12 rounded-full bg-white/5 border border-white/10 items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                            >
                                                <MaterialIcon name="close" className="text-2xl" />
                                            </button>
                                        </div>

                                        <div className="flex-1">
                                            {selected.unlocked ? (
                                                <div className="space-y-8">
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
                                                            <MaterialIcon name="text_snippet" className="text-base text-[#fe951c]" /> TRÍCH LỤC MÔ TẢ
                                                        </h4>
                                                        <p className="text-sm md:text-base text-gray-300 leading-relaxed font-medium bg-[#161824] p-5 rounded-2xl border border-white/5 shadow-inner">
                                                            {selected.description}
                                                        </p>
                                                    </div>

                                                    {selected.story && (
                                                        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#fe951c]/10 to-[#161824] border border-[#fe951c]/30 relative overflow-hidden shadow-xl">
                                                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#fe951c]/20 blur-3xl rounded-full pointer-events-none" />
                                                            <h4 className="text-[10px] font-black text-[#fdb438] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
                                                                <MaterialIcon name="auto_stories" className="text-lg" /> CÂU CHUYỆN LỊCH SỬ
                                                            </h4>
                                                            <div className="space-y-4 font-sans text-sm md:text-base text-gray-200 leading-relaxed font-medium relative z-10">
                                                                {selected.story.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {getArSceneByUnlockKey(selected.unlockKey) && (
                                                        <div className="pt-6 border-t border-white/10">
                                                            <Link
                                                                to={buildArUrl({
                                                                    locationId: CU_CHI_LOCATION_ID,
                                                                    mode: 'sim',
                                                                    scene: getArSceneByUnlockKey(selected.unlockKey)!.slug,
                                                                    discoverKey: selected.unlockKey,
                                                                })}
                                                                className="inline-flex items-center justify-center w-full md:w-auto gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#1a79e5] to-[#388cf1] text-white font-black text-sm uppercase tracking-widest shadow-[0_5px_25px_rgba(26,121,229,0.5)] hover:shadow-[0_10px_35px_rgba(26,121,229,0.7)] transition-all hover:-translate-y-1"
                                                            >
                                                                <MaterialIcon name="view_in_ar" className="text-xl" />
                                                                Khởi động AR Cổng thời gian
                                                            </Link>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-8 h-full flex flex-col">
                                                    <p className="text-base text-gray-400 leading-relaxed font-medium">
                                                        Kỷ vật này chưa được thu thập vào Kho lưu trữ của bạn. Hệ thống yêu cầu giải mã để cấp quyền truy cập.
                                                    </p>

                                                    <div className="p-8 rounded-3xl bg-[#161824] border border-white/10 mt-auto shadow-2xl relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-2 h-full bg-[#388cf1]" />

                                                        <h4 className="text-xs font-black text-[#388cf1] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                            <MaterialIcon name="radar" className="text-lg animate-pulse" /> ĐỀ XUẤT TRUY VẾT
                                                        </h4>

                                                        <div className="space-y-6">
                                                            {mode === 'offline' ? (
                                                                <div className="flex gap-5">
                                                                    <div className="w-12 h-12 rounded-full bg-[#fe951c]/20 flex items-center justify-center shrink-0 border border-[#fe951c]/40">
                                                                        <MaterialIcon name="camera" className="text-xl text-[#fdb438]" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-white mb-2 uppercase tracking-widest">Đặc Vụ Hiện Trường (Offline)</p>
                                                                        <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                                                            Di chuyển đến khu vực trưng bày tại Củ Chi. Kích hoạt <strong className="text-[#fdb438]">Camera AR</strong> và hướng máy ảnh vào đúng hiện vật thực tế để thu thập dữ liệu.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-5">
                                                                    <div className="w-12 h-12 rounded-full bg-[#1a79e5]/20 flex items-center justify-center shrink-0 border border-[#388cf1]/40">
                                                                        <MaterialIcon name="public" className="text-xl text-[#388cf1]" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-white mb-3 uppercase tracking-widest">Trinh Sát Từ Xa (Online)</p>
                                                                        <ul className="text-sm text-gray-300 space-y-4 font-medium bg-black/30 p-5 rounded-2xl border border-white/5">
                                                                            <li className="flex items-start gap-3">
                                                                                <MaterialIcon name="360" className="text-[#388cf1] shrink-0 text-lg" />
                                                                                <span>Tìm các <strong className="text-white">Hotspot ẩn</strong> trong Tour 360°.</span>
                                                                            </li>
                                                                            <li className="flex items-start gap-3">
                                                                                <MaterialIcon name="history" className="text-[#388cf1] shrink-0 text-lg" />
                                                                                <span>So sánh mốc thời gian trong Time Portal.</span>
                                                                            </li>
                                                                            <li className="flex items-start gap-3">
                                                                                <MaterialIcon name="forum" className="text-[#388cf1] shrink-0 text-lg" />
                                                                                <span>Vào Chat, <strong className="text-white">Thẩm vấn Đại sứ</strong> bằng từ khóa.</span>
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="mt-8 pt-6 border-t border-white/10">
                                                            <Link
                                                                to={mode === 'offline' ? '/scan' : `/explore`}
                                                                onClick={() => setSelected(null)}
                                                                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] text-black font-black text-xs uppercase tracking-[0.15em] shadow-[0_5px_20px_rgba(254,149,28,0.4)] transition-all hover:-translate-y-1"
                                                            >
                                                                <MaterialIcon name="explore" className="text-lg" />
                                                                {mode === 'offline' ? 'MỞ BỘ QUÉT AR NGAY' : 'BẮT ĐẦU TRINH SÁT'}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </AppLayout>
    )
}