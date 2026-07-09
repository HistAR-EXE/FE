// src/pages/QuestsPage.tsx
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { gamificationApi, type Quest, type QuestProgress } from '../features/gamification/api'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { locationsApi, type Location } from '../features/locations/api'
import { ApiError } from '../shared/api/contracts'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { isLocationLocked } from '../features/explore/locationUnlock'
import { pickQuestCover } from '../shared/media/resolveMedia'
import { SmartImage } from '../shared/ui/SmartImage'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { HERITAGE_QUEST_META } from '../features/gamification/heritageQuestSteps'

export function QuestsPage() {
    const { isAuthenticated, user } = useAuth()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const lockedLocationId = searchParams.get('locationId') || CU_CHI_LOCATION_ID

    const [locationInfo, setLocationInfo] = useState<Location | null>(null)
    const [quests, setQuests] = useState<Quest[]>([])
    const [progresses, setProgresses] = useState<QuestProgress[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all')
    const { showToast } = useToast()

    useEffect(() => {
        locationsApi.getById(lockedLocationId)
            .then(setLocationInfo)
            .catch(() => setLocationInfo(null))
    }, [lockedLocationId])

    const refetchQuests = useCallback(async () => {
        try {
            setLoading(true)
            const list = await gamificationApi.quests(lockedLocationId)
            const sortedList = [...list].sort((a, b) => {
                const orderA = HERITAGE_QUEST_META[a.id]?.difficulty === 'thử thách' ? 1 : 2;
                const orderB = HERITAGE_QUEST_META[b.id]?.difficulty === 'thử thách' ? 1 : 2;
                return orderA - orderB;
            });
            setQuests(sortedList)

            if (isAuthenticated) {
                const mine = await gamificationApi.myQuests(lockedLocationId)
                setProgresses(mine)
            } else {
                setProgresses([])
            }
        } catch (e) {
            showToast({ message: 'Không tải được danh sách chiến dịch.', type: 'error' })
        } finally {
            setLoading(false)
        }
    }, [isAuthenticated, lockedLocationId, showToast])

    useEffect(() => {
        void refetchQuests()
    }, [refetchQuests])

    useEffect(() => {
        if (!isAuthenticated) return
        const onDiscoveryRecorded = () => { void refetchQuests() }
        window.addEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
        return () => window.removeEventListener(DISCOVERY_RECORDED_EVENT, onDiscoveryRecorded)
    }, [isAuthenticated, refetchQuests])

    const getStatus = (questId: string) =>
        isAuthenticated ? progresses.find((p) => p.questId === questId)?.status ?? 'not_started' : 'not_started'

    const statusCounts = useMemo(() => {
        const counts = { all: quests.length, not_started: 0, in_progress: 0, completed: 0 }
        quests.forEach((q) => {
            const s = getStatus(q.id)
            if (s === 'not_started') counts.not_started += 1
            else if (s === 'in_progress') counts.in_progress += 1
            else if (s === 'completed') counts.completed += 1
        })
        return counts
    }, [quests, progresses, isAuthenticated])

    const filteredQuests = quests.filter((q) => statusFilter === 'all' ? true : getStatus(q.id) === statusFilter)

    const progressPct = (status: string, currentStep?: number, stepsTotal?: number) => {
        if (typeof currentStep === 'number' && typeof stepsTotal === 'number' && stepsTotal > 0) {
            return Math.max(0, Math.min(100, Math.round((currentStep / stepsTotal) * 100)))
        }
        return status === 'completed' ? 100 : status === 'in_progress' ? 58 : 0
    }

    const getProgress = (questId: string) => progresses.find((p) => p.questId === questId)

    const handleStartQuest = async (questId: string, e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isAuthenticated) {
            navigate('/login')
            return
        }
        try {
            const started = await gamificationApi.startQuest(questId)
            setProgresses((prev) => [...prev.filter((p) => p.questId !== questId), started])
            showToast({ message: 'Mật lệnh đã được kích hoạt. Chúc may mắn!', type: 'success' })
            setStatusFilter('in_progress')
            void refetchQuests()
        } catch (err) {
            showToast({ message: err instanceof ApiError ? err.message : 'Không thể bắt đầu.', type: 'error' })
        }
    }

    return (
        <AppLayout
            activeBorder="left"
            mobileBackTo={`/explore/${lockedLocationId}`}
            mobileTitle="Chiến Dịch"
            topNav={<SimpleTopNav title="Chiến Dịch" backTo={`/explore/${lockedLocationId}`} backLabel="Quay lại Di tích" />}
            className="bg-[#0a0b10] min-h-screen text-white"
        >
            {/* HERO BANNER - CHRONOS CORE (LÕI NĂNG LƯỢNG THỜI GIAN) */}
            <div className="relative w-full h-[320px] md:h-[400px] overflow-hidden border-b border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                {/* Nền ảnh */}
                <SmartImage
                    src={locationInfo?.coverImage || '/media/banner-main.jpg'}
                    fallback="/media/banner-main.jpg"
                    alt="Campaign Hub"
                    fill
                    className="filter contrast-125 brightness-50 object-cover"
                />

                {/* Lớp phủ Gradient Tối */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10] via-[#0a0b10]/60 to-transparent" />
                <div className="absolute inset-0 bg-[url('/media/grid.svg')] opacity-10 pointer-events-none" />

                {/* ======================================================= */}
                {/* LÕI NĂNG LƯỢNG ĐỒ HỌA 3D BÊN PHẢI (CHRONOS CORE) */}
                {/* ======================================================= */}
                <div className="absolute top-1/2 right-4 md:right-20 -translate-y-1/2 hidden lg:flex items-center justify-center w-80 h-80 pointer-events-none perspective-1000">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#fe951c]/30 to-[#388cf1]/20 blur-[100px] rounded-full animate-pulse" />
                    <div className="absolute inset-0 rounded-full border border-white/5 border-t-[#388cf1]/60 border-l-[#388cf1]/20 animate-[spin_15s_linear_infinite]" />
                    <div className="absolute inset-6 rounded-full border border-white/5 border-b-[#fe951c]/60 border-r-[#fe951c]/20 animate-[spin_10s_linear_infinite_reverse] scale-y-75 rotate-45" />
                    <div className="absolute inset-16 rounded-full border-2 border-dashed border-[#fdb438]/40 animate-[spin_20s_linear_infinite]" />
                    <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-[#fe951c] via-[#e07d0b] to-[#b45309] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(254,149,28,0.8)] animate-[pulse_2s_ease-in-out_infinite]">
                        <div className="absolute inset-1 bg-black/20 rounded-full blur-sm" />
                        <MaterialIcon name="api" className="text-5xl text-[#fff2a1] drop-shadow-[0_0_10px_#fff]" />
                    </div>
                    <div className="absolute top-10 right-20 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] animate-ping" />
                    <div className="absolute bottom-20 left-10 w-1.5 h-1.5 bg-[#fdb438] rounded-full shadow-[0_0_10px_#fdb438] animate-ping" style={{ animationDelay: '1s' }} />
                </div>
                {/* ======================================================= */}

                {/* Nội dung Text Bên Trái */}
                <div className="absolute inset-0 flex flex-col justify-center md:justify-end p-6 md:p-12 max-w-7xl mx-auto w-full z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#388cf1]/40 bg-[#388cf1]/10 backdrop-blur-md text-cyan-300 text-[10px] md:text-xs font-black uppercase tracking-widest w-max mb-4 shadow-lg">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                        TỌA ĐỘ HIỆN TẠI: <span className="text-white">{locationInfo?.name?.toUpperCase() || 'ĐANG TRUY XUẤT...'}</span>
                    </div>
                    <h1 className="font-black text-5xl md:text-7xl text-white drop-shadow-2xl mb-4 tracking-tighter">
                        Hồ Sơ Mật Lệnh
                    </h1>
                    <p className="text-sm md:text-base text-gray-400 max-w-2xl font-medium leading-relaxed">
                        Hóa thân thành Đặc vụ Không gian. Giải mã các đoạn ghi âm, thâm nhập không gian 360°, quét AR hiện trường để khôi phục toàn bộ dòng thời gian bị mất tại <strong className="text-cyan-400">{locationInfo?.name}</strong>.
                    </p>
                </div>
            </div>

            <main className="p-4 md:p-8 max-w-7xl mx-auto w-full relative z-20">

                {/* THANH LỌC TRẠNG THÁI */}
                <div className="flex gap-6 md:gap-10 border-b border-white/10 pb-2 mb-10 overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'all', label: 'Tất Cả Mật Lệnh', count: statusCounts.all },
                        { id: 'not_started', label: 'Mật Lệnh Mới', count: statusCounts.not_started },
                        { id: 'in_progress', label: 'Đang Giải Mã', count: statusCounts.in_progress },
                        { id: 'completed', label: 'Đã Phá Đảo', count: statusCounts.completed },
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setStatusFilter(item.id as typeof statusFilter)}
                            className={`pb-4 px-2 font-black transition-all border-b-[3px] flex items-center gap-2.5 cursor-pointer whitespace-nowrap ${
                                statusFilter === item.id
                                    ? 'text-[#fdb438] border-[#fdb438] text-sm md:text-base'
                                    : 'text-gray-500 border-transparent hover:text-gray-300 text-sm md:text-base'
                            }`}
                        >
                            {item.label}
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                                statusFilter === item.id ? 'bg-[#fe951c]/20 text-[#fdb438]' : 'bg-white/5 text-gray-500'
                            }`}>
                                {item.count}
                            </span>
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-[280px] rounded-3xl bg-[#161824] animate-pulse border border-white/5" />
                        ))}
                    </div>
                )}

                {/* LƯỚI THẺ CHIẾN DỊCH CHUẨN UX/UI MỚI NHẤT */}
                {!loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {filteredQuests.map((q, index) => {
                            const progress = getProgress(q.id)
                            const status = getStatus(q.id)
                            const meta = HERITAGE_QUEST_META[q.id]
                            const isLocked = locationInfo ? isLocationLocked(locationInfo, user) : false
                            const coverImg = pickQuestCover(q.coverImage, locationInfo?.coverImage, q.title, index)

                            // BỌC THÉP CHỐNG CRASH TẠI ĐÂY (An toàn tuyệt đối với optional chaining)
                            const totalNodes = progress?.stepsTotal ?? q.stepsTotal ?? q.steps?.length ?? meta?.steps?.length ?? 3;
                            const pct = progressPct(status, progress?.currentStep, totalNodes);

                            // Trạng thái bị khóa
                            if (isLocked) {
                                return (
                                    <div key={q.id} className="relative rounded-3xl overflow-hidden border border-white/5 bg-[#12141f] opacity-60 flex flex-col lg:flex-row h-auto lg:h-[260px]">
                                        <div className="w-full lg:w-2/5 h-48 lg:h-full relative shrink-0 grayscale blur-[4px]">
                                            <SmartImage src={coverImg} fallback={coverImg} alt={q.title} fill className="object-cover" />
                                            <div className="absolute inset-0 bg-black/80" />
                                        </div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                                            <div className="w-16 h-16 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-md mb-4 shadow-2xl">
                                                <MaterialIcon name="lock" className="text-3xl text-gray-500" />
                                            </div>
                                            <h2 className="text-xl font-black text-white">{q.title}</h2>
                                            <p className="text-xs text-gray-400 mt-2 font-medium bg-black/40 px-4 py-1.5 rounded-full">Yêu cầu hoàn thành nhiệm vụ trước</p>
                                        </div>
                                    </div>
                                )
                            }

                            // Trạng thái mở
                            return (
                                <Link
                                    key={q.id}
                                    to={`/quests/${q.id}`}
                                    className="group relative rounded-3xl overflow-hidden border border-white/10 bg-[#161824] hover:bg-[#1a1d2c] hover:border-[#388cf1]/50 transition-all duration-500 hover:-translate-y-2 shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row h-auto lg:h-[260px]"
                                >
                                    {/* CỘT TRÁI: ẢNH COVER */}
                                    <div className="w-full lg:w-[35%] h-52 lg:h-full relative shrink-0 overflow-hidden">
                                        <SmartImage src={coverImg} fallback={coverImg} alt={q.title} fill className="transition-transform duration-700 group-hover:scale-110 object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#161824]/20 to-[#161824] hidden lg:block" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#161824] via-[#161824]/40 to-transparent lg:hidden" />

                                        {/* Overlay Tags Trái */}
                                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                                            <span className="w-max px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-black text-[#fe951c] flex items-center gap-1.5 shadow-lg">
                                                <MaterialIcon name="stars" className="text-sm" /> +{q.pointsReward} XP
                                            </span>
                                        </div>
                                    </div>

                                    {/* CỘT PHẢI: THÔNG TIN CHIẾN DỊCH (LORE & LỘT) */}
                                    <div className="flex-1 p-6 flex flex-col justify-between relative z-10 min-w-0">

                                        <div>
                                            {/* Tag Nguồn Gốc & Onsite */}
                                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                    <MaterialIcon name="flag" className="text-[12px] text-gray-500" /> MISSION
                                                </span>
                                                {q.requireOnsiteCheckin ? (
                                                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                                        <MaterialIcon name="radar" className="text-[12px] animate-pulse" /> OFFLINE ONSITE
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black text-[#388cf1] uppercase tracking-widest flex items-center gap-1 bg-[#388cf1]/10 px-2 py-0.5 rounded border border-[#388cf1]/30">
                                                        <MaterialIcon name="public" className="text-[12px]" /> ONLINE REMOTE
                                                    </span>
                                                )}
                                            </div>

                                            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-3 group-hover:text-[#388cf1] transition-colors line-clamp-2">{q.title}</h2>

                                            {/* Mission Hook / Briefing */}
                                            <div className="relative pl-3 border-l-2 border-[#fdb438]/50">
                                                <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed font-medium italic">
                                                    "{meta?.missionHook || q.description}"
                                                </p>
                                            </div>
                                        </div>

                                        {/* KHU VỰC TRẠNG THÁI VÀ NÚT BẤM DƯỚI CÙNG */}
                                        <div className="mt-5 pt-4 border-t border-white/5 flex-shrink-0">
                                            {status === 'not_started' && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                                        <MaterialIcon name="lock" className="text-sm" /> <span>Đang khóa</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleStartQuest(q.id, e)}
                                                        className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-[#388cf1] text-white font-black text-xs uppercase tracking-wider transition-all hover:scale-105 border border-white/10 hover:border-[#388cf1] flex items-center gap-2 cursor-pointer shadow-md"
                                                    >
                                                        Mở Hồ Sơ <MaterialIcon name="folder_open" className="text-sm" />
                                                    </button>
                                                </div>
                                            )}

                                            {status === 'in_progress' && (
                                                <div>
                                                    <div className="flex justify-between items-end mb-2">
                                                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                                                            <MaterialIcon name="data_usage" className="text-sm animate-spin-slow" /> Đang giải mã...
                                                        </span>
                                                        {/* Áp dụng biến totalNodes bọc thép để không bị crash length */}
                                                        <span className="text-[11px] font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">
                                                            {progress?.currentStep ?? 0} / {totalNodes} Node
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/5 relative">
                                                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#388cf1] to-cyan-300 shadow-[0_0_10px_#388cf1] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            )}

                                            {status === 'completed' && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 w-max">
                                                        <MaterialIcon name="verified" className="text-emerald-400 text-base" />
                                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">ĐÃ PHÁ ĐẢO</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1 hover:text-white transition-colors">
                                                        Xem Lịch sử <MaterialIcon name="chevron_right" className="text-sm" />
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}

                {!loading && filteredQuests.length === 0 && (
                    <div className="mt-12 text-center py-24 border border-dashed border-white/10 rounded-3xl bg-[#161824]/40 backdrop-blur-xl shadow-2xl">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full border border-white/10 animate-ping" />
                            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shadow-inner relative z-10">
                                <MaterialIcon name="radar" className="text-5xl text-gray-600 animate-pulse" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Chưa có Mật lệnh nào</h3>
                        <p className="text-sm text-gray-500 font-medium">Khu vực di tích này hiện tại chưa có chiến dịch nào được kích hoạt.</p>
                    </div>
                )}
            </main>
        </AppLayout>
    )
}