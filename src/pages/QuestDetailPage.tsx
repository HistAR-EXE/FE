// src/pages/QuestDetailPage.tsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { collectionApi } from '../features/collection/api'
import { gamificationApi, type Quest, type QuestProgress } from '../features/gamification/api'
import { locationsApi } from '../features/locations/api'
import { analyticsApi } from '../features/analytics/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { QuestJourneyPanel } from '../features/gamification/QuestJourneyPanel'
import { useAuth } from '../shared/auth/useAuth'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { useVisitSession } from '../features/visit/VisitSessionProvider'
import { pickQuestCover } from '../shared/media/resolveMedia'
import { SmartImage } from '../shared/ui/SmartImage'
import { HERITAGE_QUEST_META } from '../features/gamification/heritageQuestSteps'

export function QuestDetailPage() {
    const { questId } = useParams<{ questId: string }>()
    const { isAuthenticated } = useAuth()
    const [quest, setQuest] = useState<Quest | null>(null)
    const [progress, setProgress] = useState<QuestProgress | null>(null)
    const [stepImages, setStepImages] = useState<Record<string, string>>({})
    const [locationName, setLocationName] = useState('')
    const [loading, setLoading] = useState(false)
    const { getSessionId } = useVisitSession()
    const { showToast } = useToast()

    useEffect(() => {
        if (!questId) return
        gamificationApi.questById(questId).then(setQuest).catch(() => setQuest(null))
    }, [questId])

    useEffect(() => {
        if (!questId || !isAuthenticated) return
        gamificationApi.progress(questId).then(setProgress).catch((e) => {
            showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
        })
    }, [isAuthenticated, questId, showToast])

    const refetchProgress = useCallback(async () => {
        if (!questId || !isAuthenticated) return
        try {
            const next = await gamificationApi.progress(questId)
            setProgress(next)
        } catch (e) {
            // ignore
        }
    }, [isAuthenticated, questId])

    const steps = quest?.steps || []
    const title = quest?.title || 'Hồ Sơ Điệp Vụ'
    const story = quest?.story || quest?.description || 'Đang giải mã dữ liệu mật...'
    const status = progress?.status ?? 'not_started'
    const currentStep = progress?.currentStep ?? 0
    const stepsTotal = progress?.stepsTotal ?? quest?.stepsTotal ?? steps.length
    const locationId = quest?.locationId ?? ''
    const visitSessionId = locationId ? getSessionId(locationId) : undefined

    const meta = questId ? HERITAGE_QUEST_META[questId] : null;

    useEffect(() => {
        if (!locationId) return
        locationsApi.getById(locationId).then((loc) => setLocationName(loc.name)).catch(() => {})

        collectionApi.catalog(locationId).then((list) => {
            const map: Record<string, string> = {}
            list.forEach((art) => { map[art.unlockKey] = art.imageUrl })
            setStepImages(map)
        }).catch(() => {})
    }, [locationId])

    useEffect(() => {
        if (!questId || !isAuthenticated || status !== 'in_progress') return
        const onDiscoveryRecorded = (event: Event) => {
            const detail = (event as CustomEvent<{ recordKey: string; recorded: boolean }>).detail
            if (!detail?.recorded) return
            void analyticsApi.recordEvent({
                locationId,
                visitSessionId,
                eventType: 'QUEST_STEP_COMPLETED',
                eventKey: detail.recordKey,
                source: 'quest_detail',
            })
            void refetchProgress()
        }
        window.addEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
        return () => window.removeEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
    }, [questId, isAuthenticated, status, locationId, visitSessionId, refetchProgress])

    const startQuest = async () => {
        if (!questId || !isAuthenticated) return
        setLoading(true)
        try {
            const started = await gamificationApi.startQuest(questId)
            setProgress(started)
            showToast({ message: 'Mật lệnh đã được kích hoạt! Tiến hành giải mã.', type: 'success' })
        } catch (e) {
            showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const coverImg = pickQuestCover(quest?.coverImage, undefined, title, 0)
    const pct = stepsTotal > 0 ? Math.min(100, Math.round((currentStep / stepsTotal) * 100)) : 0

    return (
        <AppLayout
            activeBorder="left"
            topNav={<SimpleTopNav title="Hồ Sơ Chi Tiết" />}
            mobileBackTo={`/quests?locationId=${locationId}`}
            mobileTitle="Hồ Sơ Mật"
            className="bg-[#0a0b10] min-h-screen text-white font-sans selection:bg-[#fe951c] selection:text-black"
        >
            <main className="max-w-6xl mx-auto w-full pb-24 md:pb-12 mt-14 md:mt-16">

                {/* ========================================= */}
                {/* HERO COVER - RADAR CORE 3D VÀNG CAM */}
                {/* ========================================= */}
                <div className="h-80 md:h-[450px] relative overflow-hidden md:rounded-b-[3rem] border-b border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.8)] bg-[#0f1015]">
                    {/* Hình Nền */}
                    <div className="absolute inset-0 opacity-40">
                        <SmartImage src={coverImg} fallback={coverImg} alt={title} fill className="filter contrast-125 saturate-50 object-cover" />
                    </div>

                    {/* Các lớp Gradient phủ tối mờ */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10] via-[#0a0b10]/90 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-[url('/media/grid.svg')] opacity-10 pointer-events-none mix-blend-overlay" />

                    {/* VÒNG TRÒN NĂNG LƯỢNG 3D PHÁT SÁNG (GÓC PHẢI) NHƯ ẢNH THAM KHẢO */}
                    <div className="absolute right-10 md:right-32 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-64 h-64 pointer-events-none">
                        {/* Hào quang cam mạnh mẽ */}
                        <div className="absolute inset-0 bg-[#fe951c]/30 blur-[90px] rounded-full animate-pulse" />

                        {/* Các vòng đồng tâm */}
                        <div className="absolute inset-0 rounded-full border border-gray-700/50 animate-[spin_20s_linear_infinite]" />
                        <div className="absolute inset-4 rounded-full border border-gray-600/60 animate-[spin_15s_linear_infinite_reverse]" />
                        <div className="absolute inset-8 rounded-full border border-gray-500/70 animate-[spin_10s_linear_infinite]" />

                        {/* Lõi Cam rực rỡ */}
                        <div className="absolute w-28 h-28 bg-gradient-to-br from-[#fe951c] to-[#d97706] rounded-full shadow-[0_0_60px_#fe951c] flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]">
                            <MaterialIcon name="explore" className="text-black text-5xl" />
                        </div>
                    </div>

                    <div className="absolute top-6 left-6 z-20">
                        <Link to={`/quests?locationId=${locationId}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                            <MaterialIcon name="arrow_back" className="text-sm" /> Rút lui
                        </Link>
                    </div>

                    {/* Text Thông tin */}
                    <div className="absolute bottom-10 left-6 md:left-12 z-20 max-w-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                KHU VỰC TÁC CHIẾN: {locationName || 'ĐANG TẢI...'}
                            </span>
                        </div>
                        <h1 className="font-black text-4xl md:text-7xl text-white drop-shadow-2xl mb-4 tracking-tighter leading-tight">{title}</h1>
                        <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed drop-shadow-md">
                            Hóa thân thành <strong className="text-[#fe951c]">Nhà thám hiểm thời gian</strong>. Đọc kỹ hồ sơ, tìm kiếm manh mối, thu thập kỷ vật và giải mã toàn bộ bí ẩn lịch sử bị vùi lấp tại khu vực này.
                        </p>
                    </div>
                </div>

                <div className="p-4 md:p-8 space-y-10">

                    {/* ========================================= */}
                    {/* BẢNG THÔNG SỐ & MẬT LỆNH (TERMINAL STYLE) */}
                    {/* ========================================= */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

                        {/* Cột trái: Cốt truyện / Lore */}
                        <section className="lg:col-span-2 p-6 md:p-8 rounded-3xl bg-[#161824] border border-white/5 font-mono relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 left-0 w-2 h-full bg-[#fe951c]" />

                            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4 relative z-10">
                                <h3 className="font-black text-[#fe951c] uppercase tracking-widest text-sm flex items-center gap-2.5">
                                    <MaterialIcon name="terminal" className="text-xl" /> MISSION BRIEFING
                                </h3>
                                <span className="text-[10px] text-gray-500 tracking-widest">ENCRYPTED // TS-2026</span>
                            </div>

                            <div className="relative z-10">
                                <p className="text-[13px] md:text-[15px] text-emerald-400 leading-[1.8] font-mono font-medium text-justify">
                                    {story}
                                </p>
                            </div>
                        </section>

                        {/* Cột phải: Thông số Nhiệm vụ */}
                        <section className="flex flex-col gap-5">
                            {/* Panel Tiến độ (Nếu đang làm) */}
                            {(status === 'in_progress' || status === 'completed') && (
                                <div className="p-6 rounded-3xl bg-[#12141f] border border-[#fdb438]/20 shadow-lg">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-[10px] font-black text-[#fdb438] uppercase tracking-widest">TIẾN ĐỘ GIẢI MÃ</span>
                                        <span className="text-2xl font-black text-white">{pct}%</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-gray-300">{currentStep} / {stepsTotal} Node đã mở</span>
                                    </div>
                                    <div className="h-2 bg-black rounded-full overflow-hidden border border-white/10 relative">
                                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#fe951c] to-[#fdb438] shadow-[0_0_10px_#fe951c]" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )}

                            {/* Panel Trạng thái Chưa Bắt đầu */}
                            {status === 'not_started' && (
                                <div className="p-6 rounded-3xl bg-[#12141f] border border-[#388cf1]/20 flex flex-col justify-center items-center text-center shadow-lg h-full">
                                    <div className="w-16 h-16 rounded-full bg-[#388cf1]/10 flex items-center justify-center mb-4">
                                        <MaterialIcon name="lock" className="text-3xl text-[#388cf1]" />
                                    </div>
                                    <h4 className="font-black text-white text-lg mb-2">Hồ Sơ Đang Khóa</h4>
                                    <p className="text-xs text-gray-400 mb-6 px-4">Kích hoạt để cấp quyền giải mã các dữ liệu lịch sử.</p>

                                    {isAuthenticated ? (
                                        <button
                                            onClick={startQuest}
                                            disabled={loading}
                                            className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] text-black font-black text-sm uppercase tracking-widest shadow-[0_5px_20px_rgba(254,149,28,0.4)] hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            {loading ? <MaterialIcon name="refresh" className="animate-spin" /> : <MaterialIcon name="power_settings_new" />}
                                            {loading ? 'ĐANG KẾT NỐI...' : 'BẮT ĐẦU HÀNH TRÌNH'}
                                        </button>
                                    ) : (
                                        <Link to="/login" className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm uppercase hover:bg-white/20 transition-colors">
                                            Đăng Nhập
                                        </Link>
                                    )}
                                </div>
                            )}

                            {/* Panel Thù lao (Rewards) */}
                            <div className="p-6 rounded-3xl bg-[#161824] border border-white/5 flex flex-col gap-4">
                                <h3 className="font-black text-gray-500 text-xs uppercase tracking-widest">THÙ LAO NHIỆM VỤ</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#fe951c]/10 flex items-center justify-center border border-[#fe951c]/20">
                                        <MaterialIcon name="stars" className="text-xl text-[#fdb438]" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase">Kinh nghiệm</p>
                                        <p className="text-lg font-black text-white">+{quest?.pointsReward || 0} XP</p>
                                    </div>
                                </div>
                                {meta?.badge && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                            <MaterialIcon name="military_tech" className="text-xl text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase">Kỷ vật thu thập</p>
                                            <p className="text-sm font-black text-white">{meta.badge.replace('Kỷ vật: ', '')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* TRỤC TỌA ĐỘ BẢN ĐỒ HÀNH TRÌNH (JOURNEY MAP) */}
                    <QuestJourneyPanel
                        steps={steps}
                        questId={questId || ''}
                        locationId={locationId}
                        status={status}
                        currentStep={currentStep}
                        stepImages={stepImages}
                    />

                </div>
            </main>
        </AppLayout>
    )
}