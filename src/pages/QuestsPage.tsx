// src/pages/QuestsPage.tsx
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { discoveriesApi, gamificationApi, type Quest, type QuestProgress } from '../features/gamification/api'
import { questBlockedByEarlier, questMissingTourKeys } from '../features/gamification/questGate'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { locationsApi, type Location } from '../features/locations/api'
import { ApiError } from '../shared/api/contracts'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { isLocationLocked } from '../features/explore/locationUnlock'
import { pickQuestCover } from '../shared/media/resolveMedia'
import { SmartImage } from '../shared/ui/SmartImage'
import { analyticsApi } from '../features/analytics/api'
import { isDevMinigameQuestVisible } from '../features/minigame/api'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { HERITAGE_QUEST_META } from '../features/gamification/heritageQuestSteps'

type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed'

const FILTERS: { id: StatusFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'Tất cả mật lệnh', icon: 'apps' },
    { id: 'not_started', label: 'Mật lệnh mới', icon: 'folder' },
    { id: 'in_progress', label: 'Đang giải mã', icon: 'data_usage' },
    { id: 'completed', label: 'Đã phá đảo', icon: 'verified' },
]

export function QuestsPage() {
    const { isAuthenticated, user } = useAuth()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const lockedLocationId = searchParams.get('locationId') || CU_CHI_LOCATION_ID

    const [locationInfo, setLocationInfo] = useState<Location | null>(null)
    const [quests, setQuests] = useState<Quest[]>([])
    const [progresses, setProgresses] = useState<QuestProgress[]>([])
    const [discoveredKeys, setDiscoveredKeys] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
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
            const sortedList = [...list]
                .filter((quest) => isDevMinigameQuestVisible(quest.id))
                .sort((a, b) => (a.requiredOrder ?? 999) - (b.requiredOrder ?? 999))
            setQuests(sortedList)

            if (isAuthenticated) {
                const [mine, summary] = await Promise.all([
                    gamificationApi.myQuests(lockedLocationId),
                    discoveriesApi.summary(lockedLocationId),
                ])
                setProgresses(mine)
                setDiscoveredKeys(summary.keys ?? [])
            } else {
                setProgresses([])
                setDiscoveredKeys([])
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

    // Tổng quan chiến dịch (chỉ để hiển thị, không ảnh hưởng logic)
    const totalXp = quests.reduce((sum, q) => sum + (q.pointsReward ?? 0), 0)
    const earnedXp = quests
        .filter((q) => getStatus(q.id) === 'completed')
        .reduce((sum, q) => sum + (q.pointsReward ?? 0), 0)
    const overallPct = quests.length > 0 ? Math.round((statusCounts.completed / quests.length) * 100) : 0

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
            void analyticsApi.recordEvent({
                eventType: 'quest_start',
                eventKey: questId,
                locationId: lockedLocationId,
                source: 'quests',
            })
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
            className="min-h-screen !bg-[#DCEBFF] text-[#0F1B33]"
        >
            {/* ───────── NỀN SÁNG THƯƠNG HIỆU (cố định khi cuộn) ───────── */}
            <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#DCEBFF]">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#C7DDFF_0%,#DCEBFF_40%,#EEF5FF_66%,#FFF2C3_100%)]" />
                <div className="absolute -top-32 -left-24 h-[460px] w-[460px] rounded-full bg-[#0275FB]/20 blur-[120px]" />
                <div className="absolute -bottom-32 -right-24 h-[480px] w-[480px] rounded-full bg-[#FDC908]/35 blur-[120px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#0275FB_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.08]" />
            </div>

            <div className="relative z-10 pt-14 md:pt-16">
                {/* ───────── HERO ───────── */}
                <section className="relative h-[300px] w-full overflow-hidden rounded-b-[2.5rem] shadow-[0_24px_60px_-18px_rgba(2,117,251,0.55)] md:h-[360px]">
                    <SmartImage
                        src={locationInfo?.coverImage || '/media/banner-main.jpg'}
                        fallback="/media/banner-main.jpg"
                        alt="Campaign Hub"
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0275FB] via-[#0275FB]/85 to-[#0275FB]/30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#015CC8]/70 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.12]" />
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-[#FDC908] via-[#FFF2C3] to-[#FDC908]" />

                    {/* Lõi năng lượng thời gian */}
                    <div className="pointer-events-none absolute right-6 top-1/2 hidden h-72 w-72 -translate-y-1/2 items-center justify-center md:right-20 lg:flex">
                        <div className="absolute inset-0 animate-pulse rounded-full bg-[#FDC908]/30 blur-[70px]" />
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/50 animate-[spin_20s_linear_infinite]" />
                        <div className="absolute inset-8 rounded-full border-2 border-[#FDC908]/80 border-t-transparent animate-[spin_9s_linear_infinite_reverse]" />
                        <div className="absolute inset-16 rounded-full border border-white/40 animate-[spin_14s_linear_infinite]" />
                        <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE58A] via-[#FDC908] to-[#F5A800] shadow-[0_0_50px_rgba(253,201,8,0.9)] animate-[pulse_2.4s_ease-in-out_infinite]">
                            <MaterialIcon name="api" className="text-5xl text-[#0F1B33]" />
                        </div>
                        <div className="absolute right-12 top-10 h-2.5 w-2.5 animate-ping rounded-full bg-white" />
                        <div className="absolute bottom-16 left-8 h-2 w-2 animate-ping rounded-full bg-[#FFF2C3]" style={{ animationDelay: '1s' }} />
                    </div>

                    <div className="absolute inset-0 z-10 mx-auto flex w-full max-w-7xl flex-col justify-center p-6 md:justify-end md:p-12 md:pb-14">
                        <div className="mb-4 inline-flex w-max items-center gap-2 rounded-full border border-[#FDC908]/70 bg-[#FFF2C3] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#0F1B33] shadow-lg md:text-xs">
                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#0275FB]" />
                            Tọa độ hiện tại: <span className="text-[#0275FB]">{locationInfo?.name?.toUpperCase() || 'ĐANG TRUY XUẤT...'}</span>
                        </div>
                        <h1 className="mb-3 text-4xl font-black tracking-tighter text-white drop-shadow-lg md:text-6xl">
                            Hồ Sơ Mật Lệnh
                        </h1>
                        <p className="max-w-2xl text-sm font-medium leading-relaxed text-white/90 md:text-base">
                            Hóa thân thành Đặc vụ Không gian. Giải mã các đoạn ghi âm, thâm nhập không gian 360°, quét AR hiện trường để khôi phục toàn bộ dòng thời gian bị mất tại <strong className="text-[#FDC908]">{locationInfo?.name}</strong>.
                        </p>
                    </div>
                </section>

                <main className="relative z-20 mx-auto w-full max-w-7xl px-4 pb-16 md:px-8">

                    {/* ───────── BẢNG TIẾN ĐỘ + BỘ LỌC (nổi lên trên hero) ───────── */}
                    <section className="-mt-10 mb-10 rounded-3xl border-2 border-[#0275FB]/20 bg-white p-4 shadow-[0_24px_60px_-18px_rgba(2,117,251,0.4)] md:p-6">
                        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                            <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-end justify-between gap-3">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-[#0275FB]">Tiến độ chiến dịch</p>
                                    <p className="text-2xl font-black text-[#0F1B33]">{overallPct}%</p>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full border border-[#0275FB]/15 bg-[#DCEBFF]">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#0275FB] via-[#4DA3FF] to-[#FDC908] transition-all duration-1000"
                                        style={{ width: `${overallPct}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs font-bold text-slate-500">
                                    {statusCounts.completed}/{statusCounts.all} mật lệnh đã phá đảo
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-3 rounded-2xl border-2 border-[#FDC908]/60 bg-gradient-to-br from-[#FFF2C3] to-white px-5 py-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FDC908] text-[#0F1B33] shadow-md">
                                    <MaterialIcon name="stars" className="text-2xl" />
                                </span>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Điểm phá đảo</p>
                                    <p className="text-xl font-black text-[#0F1B33]">
                                        {earnedXp} <span className="text-sm font-bold text-slate-500">/ {totalXp} XP</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bộ lọc trạng thái */}
                        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                            {FILTERS.map((item) => {
                                const active = statusFilter === item.id
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setStatusFilter(item.id)}
                                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                                            active
                                                ? 'border-transparent bg-gradient-to-br from-[#0275FB] to-[#015CC8] text-white shadow-[0_10px_24px_-8px_rgba(2,117,251,0.7)]'
                                                : 'border-[#0275FB]/15 bg-[#F2F7FF] text-slate-600 hover:border-[#0275FB]/50 hover:bg-white'
                                        }`}
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <MaterialIcon name={item.icon} className={`shrink-0 text-lg ${active ? 'text-[#FDC908]' : 'text-[#0275FB]'}`} />
                                            <span className="truncate text-xs font-black md:text-[13px]">{item.label}</span>
                                        </span>
                                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black ${active ? 'bg-[#FDC908] text-[#0F1B33]' : 'bg-white text-[#0275FB] border border-[#0275FB]/20'}`}>
                                            {statusCounts[item.id]}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    {loading && (
                        <div className="mb-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-[280px] animate-pulse rounded-3xl border-2 border-[#0275FB]/10 bg-white/80" />
                            ))}
                        </div>
                    )}

                    {/* ───────── LƯỚI THẺ MẬT LỆNH ───────── */}
                    {!loading && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                            {filteredQuests.map((q, index) => {
                                const progress = getProgress(q.id)
                                const status = getStatus(q.id)
                                const meta = HERITAGE_QUEST_META[q.id]
                                const isLocked = locationInfo ? isLocationLocked(locationInfo, user) : false
                                const coverImg = pickQuestCover(q.coverImage, locationInfo?.coverImage, q.title, index)

                                // BỌC THÉP CHỐNG CRASH TẠI ĐÂY (An toàn tuyệt đối với optional chaining)
                                const totalNodes = progress?.stepsTotal ?? q.stepsTotal ?? q.steps?.length ?? meta?.steps?.length ?? 3;
                                const pct = progressPct(status, progress?.currentStep, totalNodes);
                                const completedIds = new Set(quests.filter((other) => getStatus(other.id) === 'completed').map((other) => other.id))
                                const waitingEarlier = questBlockedByEarlier(q, quests, completedIds) || questMissingTourKeys(q, discoveredKeys)
                                const waitingLabel = questMissingTourKeys(q, discoveredKeys)
                                    ? 'Mở sau hai cảnh tour'
                                    : 'Mở sau mật lệnh trước'
                                const finale = q.steps?.[q.steps.length - 1]
                                const premiumClimax = finale?.actionType === 'portal' && (finale.portalEra === 1948 || finale.portalEra === 1968)
                                const storyLine = (q.story || q.description || '').trim()
                                const orderLabel = String(index + 1).padStart(2, '0')

                                // Trạng thái bị khóa
                                if (isLocked) {
                                    return (
                                        <div key={q.id} className="relative flex h-auto flex-col overflow-hidden rounded-3xl border-2 border-slate-200 bg-white/70 lg:h-[260px] lg:flex-row">
                                            <div className="relative h-48 w-full shrink-0 grayscale blur-[3px] lg:h-full lg:w-2/5">
                                                <SmartImage src={coverImg} fallback={coverImg} alt={q.title} fill className="object-cover" />
                                                <div className="absolute inset-0 bg-white/60" />
                                            </div>
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/55 p-6 text-center backdrop-blur-[2px]">
                                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#0275FB]/20 bg-white shadow-xl">
                                                    <MaterialIcon name="lock" className="text-3xl text-[#0275FB]" />
                                                </div>
                                                <h2 className="text-xl font-black text-[#0F1B33]">{q.title}</h2>
                                                <p className="mt-2 rounded-full border border-[#FDC908]/60 bg-[#FFF2C3] px-4 py-1.5 text-xs font-bold text-[#7A5B00]">Yêu cầu hoàn thành nhiệm vụ trước</p>
                                            </div>
                                        </div>
                                    )
                                }

                                // Trạng thái mở
                                return (
                                    <Link
                                        key={q.id}
                                        to={`/quests/${q.id}`}
                                        className={`group relative flex h-auto flex-col overflow-hidden rounded-3xl border-2 bg-white shadow-[0_18px_44px_-16px_rgba(2,117,251,0.35)] transition-all duration-500 hover:-translate-y-1.5 hover:border-[#0275FB]/60 hover:shadow-[0_28px_60px_-16px_rgba(2,117,251,0.5)] lg:min-h-[280px] lg:flex-row ${
                                            status === 'completed' ? 'border-emerald-300' : 'border-[#0275FB]/15'
                                        }`}
                                    >
                                        {/* CỘT TRÁI: ẢNH COVER */}
                                        <div className="relative h-52 w-full shrink-0 overflow-hidden lg:h-auto lg:w-[35%]">
                                            <SmartImage src={coverImg} fallback={coverImg} alt={q.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B33]/55 via-transparent to-transparent" />
                                            <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent to-white/25 lg:block" />

                                            <span className="absolute left-4 top-4 flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#0275FB] px-2 text-sm font-black text-white shadow-lg ring-2 ring-white/70">
                                                #{orderLabel}
                                            </span>
                                            <span className="absolute bottom-4 left-4 flex w-max items-center gap-1.5 rounded-full bg-[#FDC908] px-3 py-1.5 text-[11px] font-black text-[#0F1B33] shadow-lg">
                                                <MaterialIcon name="stars" className="text-sm" /> +{q.pointsReward} XP
                                            </span>
                                        </div>

                                        {/* CỘT PHẢI: THÔNG TIN */}
                                        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between p-6">
                                            <div>
                                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                                    <span className="flex items-center gap-1 rounded-lg border border-[#FDC908]/60 bg-[#FFF2C3] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#7A5B00]">
                                                        <MaterialIcon name="flag" className="text-[12px]" /> Mission
                                                    </span>
                                                    {q.requireOnsiteCheckin ? (
                                                        <span className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                                                            <MaterialIcon name="radar" className="animate-pulse text-[12px]" /> Offline onsite
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 rounded-lg border border-[#0275FB]/30 bg-[#0275FB]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#0275FB]">
                                                            <MaterialIcon name="public" className="text-[12px]" /> Online remote
                                                        </span>
                                                    )}
                                                </div>

                                                <h2 className="mb-2 line-clamp-2 text-xl font-black leading-tight text-[#0F1B33] transition-colors group-hover:text-[#0275FB] sm:text-2xl">{q.title}</h2>

                                                {meta && (
                                                    <p className="mb-2 text-[11px] font-bold text-[#0275FB]">
                                                        {meta.difficulty === 'dễ' ? 'Dễ' : meta.difficulty === 'trung bình' ? 'Trung bình' : 'Thử thách'}
                                                        {' · '}
                                                        {meta.estimatedMinutes} phút
                                                    </p>
                                                )}

                                                {storyLine && (
                                                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                                                        {storyLine}
                                                    </p>
                                                )}

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    <span className="rounded-full border border-[#0275FB]/20 bg-[#0275FB]/10 px-2.5 py-1 text-[11px] font-bold text-[#0275FB]">Khám phá +10 điểm mỗi khóa</span>
                                                    {q.steps?.some((step) => step.unlockKey === 'tour:sa-ban') && (
                                                        <span className="rounded-full border border-[#0275FB]/20 bg-[#0275FB]/10 px-2.5 py-1 text-[11px] font-bold text-[#0275FB]">Đố sa bàn đúng +50 một lần</span>
                                                    )}
                                                    <span className="rounded-full border border-[#FDC908]/70 bg-[#FFF2C3] px-2.5 py-1 text-[11px] font-black text-[#7A5B00]">Phá đảo +{q.pointsReward} một lần</span>
                                                    {premiumClimax && (
                                                        <span className="flex items-center gap-1 rounded-full bg-[#0F1B33] px-2.5 py-1 text-[11px] font-bold text-[#FDC908]">
                                                            <MaterialIcon name="workspace_premium" className="text-[13px]" /> Cao trào mở bằng Premium
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* KHU VỰC TRẠNG THÁI VÀ NÚT BẤM */}
                                            <div className="mt-5 shrink-0 border-t-2 border-dashed border-[#0275FB]/15 pt-4">
                                                {status === 'not_started' && (
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                            <MaterialIcon name="folder" className="text-sm" /> <span>Chưa mở</span>
                                                        </div>
                                                        {waitingEarlier ? (
                                                            <button
                                                                type="button"
                                                                disabled
                                                                className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-400"
                                                            >
                                                                {waitingLabel}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleStartQuest(q.id, e)}
                                                                className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FDC908] to-[#FFB800] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#0F1B33] shadow-[0_8px_20px_-6px_rgba(253,201,8,0.8)] transition-all hover:scale-105"
                                                            >
                                                                Mở Hồ Sơ <MaterialIcon name="folder_open" className="text-sm" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {status === 'in_progress' && (
                                                    <div>
                                                        <div className="mb-2 flex items-end justify-between">
                                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#0275FB]">
                                                                <MaterialIcon name="data_usage" className="animate-spin-slow text-sm" /> Đang giải mã...
                                                            </span>
                                                            {/* Áp dụng biến totalNodes bọc thép để không bị crash length */}
                                                            <span className="rounded-lg border border-[#0275FB]/20 bg-[#0275FB]/10 px-2 py-0.5 text-[11px] font-black text-[#0275FB]">
                                                                {progress?.currentStep ?? 0} / {totalNodes} Node
                                                            </span>
                                                        </div>
                                                        <div className="relative h-2.5 overflow-hidden rounded-full border border-[#0275FB]/15 bg-[#DCEBFF]">
                                                            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#0275FB] to-[#FDC908] transition-all duration-1000" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                )}

                                                {status === 'completed' && (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex w-max items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5">
                                                            <MaterialIcon name="verified" className="text-base text-emerald-600" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Đã phá đảo</span>
                                                        </div>
                                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#0275FB] transition-colors group-hover:text-[#015CC8]">
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
                        <div className="mt-12 rounded-3xl border-2 border-dashed border-[#0275FB]/30 bg-white/80 py-24 text-center shadow-[0_24px_60px_-18px_rgba(2,117,251,0.3)] backdrop-blur-xl">
                            <div className="relative mx-auto mb-6 h-24 w-24">
                                <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#FDC908]/60" />
                                <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#FDC908]/60 bg-[#FFF2C3] shadow-inner">
                                    <MaterialIcon name="radar" className="animate-pulse text-5xl text-[#0275FB]" />
                                </div>
                            </div>
                            <h3 className="mb-2 text-2xl font-black text-[#0F1B33]">Chưa có Mật lệnh nào</h3>
                            <p className="text-sm font-medium text-slate-500">Khu vực di tích này hiện tại chưa có chiến dịch nào được kích hoạt.</p>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    )
}
