// src/pages/QuestsPage.tsx
// Trang Nhiệm vụ của một di tích: 2 nhóm Online (làm từ xa) và Tại di tích (cần có mặt).
// Trạng thái, khóa và tiến độ do BE tính (API v2); trang chỉ hiển thị.

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { analyticsApi } from '../features/analytics/api'
import { isLocationLocked } from '../features/explore/locationUnlock'
import { DISCOVERY_RECORDED_EVENT } from '../features/gamification/discoveryRouting'
import { QuestBackdrop } from '../features/gamification/QuestBackdrop'
import {
    DIFFICULTY_LABEL,
    TRACK_LABEL,
    completionOutcome,
    questsV2Api,
    trackFromParam,
    trackToParam,
    type QuestTrack,
    type QuestV2Card,
} from '../features/gamification/questsV2Api'
import { locationsApi, type Location } from '../features/locations/api'
import { StoryJourneyPanel } from '../features/story/StoryJourneyPanel'
import { isDevMinigameQuestVisible } from '../features/minigame/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useAuth } from '../shared/auth/useAuth'
import { CU_CHI_LOCATION_ID, siteCodeFromLocationId } from '../shared/config/constants'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { pickQuestCover } from '../shared/media/resolveMedia'
import { SmartImage } from '../shared/ui/SmartImage'
import { useToast } from '../shared/ui/toast/useToast'
import { PremiumContentModal } from '../components/monetization/PremiumContentModal'

const TRACKS: { id: QuestTrack; icon: string; hint: string }[] = [
    { id: 'ONLINE', icon: 'public', hint: 'Làm từ xa: tour 360°, Cổng thời gian, Chrono' },
    { id: 'ONSITE', icon: 'location_on', hint: 'Cần có mặt: quét QR tại các trạm' },
]

export function QuestsPage() {
    const { isAuthenticated, user } = useAuth()
    const { applyEngagement } = useUserProgress()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const { showToast } = useToast()

    const locationId = searchParams.get('locationId') || CU_CHI_LOCATION_ID
    const track = trackFromParam(searchParams.get('track'))

    const [locationInfo, setLocationInfo] = useState<Location | null>(null)
    const [quests, setQuests] = useState<QuestV2Card[]>([])
    const [loading, setLoading] = useState(true)
    const [startingId, setStartingId] = useState<string | null>(null)
    const [premiumQuest, setPremiumQuest] = useState<QuestV2Card | null>(null)
    const reconciledFor = useRef<string | null>(null)

    useEffect(() => {
        locationsApi
            .getById(locationId)
            .then(setLocationInfo)
            .catch(() => setLocationInfo(null))
    }, [locationId])

    const refetch = useCallback(async () => {
        try {
            const list = await questsV2Api.list(locationId)
            setQuests(list.filter((quest) => isDevMinigameQuestVisible(quest.id)))
        } catch {
            showToast({ message: 'Không tải được danh sách nhiệm vụ.', type: 'error' })
        } finally {
            setLoading(false)
        }
    }, [locationId, showToast])

    useEffect(() => {
        void refetch()
    }, [refetch, isAuthenticated])

    // Người đang làm dở mà đã đủ bước bắt buộc (ví dụ sau khi luật thay đổi) → hoàn thành một lần khi mở trang.
    useEffect(() => {
        if (!isAuthenticated || loading || reconciledFor.current === locationId) return
        reconciledFor.current = locationId
        void questsV2Api
            .reconcile(locationId)
            .then((completed) => {
                if (completed.length === 0) return
                completed.forEach((item) => {
                    const quest = quests.find((q) => q.id === item.questId)
                    if (quest) applyEngagement(completionOutcome(item, quest))
                })
                void refetch()
            })
            .catch(() => undefined)
    }, [isAuthenticated, loading, locationId, quests, applyEngagement, refetch])

    useEffect(() => {
        if (!isAuthenticated) return
        const onRecorded = () => {
            void refetch()
        }
        window.addEventListener(DISCOVERY_RECORDED_EVENT, onRecorded)
        return () => window.removeEventListener(DISCOVERY_RECORDED_EVENT, onRecorded)
    }, [isAuthenticated, refetch])

    const byTrack = useMemo(() => {
        const groups: Record<QuestTrack, QuestV2Card[]> = { ONLINE: [], ONSITE: [] }
        quests.forEach((quest) => groups[quest.track === 'ONSITE' ? 'ONSITE' : 'ONLINE'].push(quest))
        return groups
    }, [quests])

    const visible = byTrack[track]
    const completedCount = visible.filter((q) => q.status === 'COMPLETED').length
    const totalXp = visible.reduce((sum, q) => sum + q.pointsReward, 0)
    const earnedXp = visible.filter((q) => q.status === 'COMPLETED').reduce((sum, q) => sum + q.pointsReward, 0)
    const locationLocked = locationInfo ? isLocationLocked(locationInfo, user) : false

    const selectTrack = (next: QuestTrack) => {
        const params = new URLSearchParams(searchParams)
        params.set('track', trackToParam(next))
        setSearchParams(params, { replace: true })
    }

    const handleStart = async (quest: QuestV2Card, event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (!isAuthenticated) {
            navigate('/login')
            return
        }
        setStartingId(quest.id)
        try {
            const result = await questsV2Api.start(quest.id)
            void analyticsApi.recordEvent({ eventType: 'quest_start', eventKey: quest.id, locationId, source: 'quests' })
            if (result.completed.length > 0) {
                result.completed.forEach((item) => applyEngagement(completionOutcome(item, result.detail.quest)))
            } else {
                showToast({ message: `Đã nhận “${quest.title}”.`, type: 'success' })
            }
            setQuests((prev) => prev.map((q) => (q.id === quest.id ? result.detail.quest : q)))
            void refetch()
        } catch (error) {
            showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
            void refetch()
        } finally {
            setStartingId(null)
        }
    }

    return (
        <AppLayout
            activeBorder="left"
            hideTopNav
            className="min-h-screen !bg-[#DCEBFF] text-[#0F1B33]"
        >
            <QuestBackdrop />

            <div className="relative z-10">
                <section className="relative h-[240px] w-full overflow-hidden rounded-b-[2.5rem] shadow-[0_24px_60px_-18px_rgba(2,117,251,0.55)] md:h-[300px]">
                    <SmartImage src={locationInfo?.coverImage || '/media/banner-main.jpg'} fallback="/media/banner-main.jpg" alt="" fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0275FB] via-[#0275FB]/85 to-[#0275FB]/30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#015CC8]/70 via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-[#FDC908] via-[#FFF2C3] to-[#FDC908]" />

                    <div className="absolute inset-0 z-10 mx-auto flex w-full max-w-7xl flex-col justify-center p-6 md:justify-end md:p-12 md:pb-16">
                        <p className="mb-3 inline-flex w-max items-center gap-2 rounded-full border border-[#FDC908]/70 bg-[#FFF2C3] px-3.5 py-1 text-[11px] font-black text-[#0F1B33] shadow-lg">
                            <MaterialIcon name="location_on" className="text-sm text-[#0275FB]" />
                            {locationInfo?.name || 'Di tích'}
                        </p>
                        <h1 className="mb-2 text-4xl font-black tracking-tight text-white drop-shadow-lg md:text-5xl">Nhiệm vụ</h1>
                        <p className="max-w-2xl text-sm font-medium leading-relaxed text-white/90 md:text-base">
                            Hoàn thành các bước để nhận XP. Bước bạn đã làm ở nơi khác trong app vẫn được tính.
                        </p>
                    </div>
                </section>

                <main className="relative z-20 mx-auto w-full max-w-7xl px-4 pb-16 md:px-8">
                    <section className="-mt-10 mb-8 rounded-3xl border-2 border-[#0275FB]/20 bg-white p-3 shadow-[0_24px_60px_-18px_rgba(2,117,251,0.4)] md:p-4">
                        <div role="tablist" aria-label="Nhóm nhiệm vụ" className="grid grid-cols-2 gap-2">
                            {TRACKS.map((item) => {
                                const active = track === item.id
                                const list = byTrack[item.id]
                                const done = list.filter((q) => q.status === 'COMPLETED').length
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        data-testid={`quest-tab-${item.id.toLowerCase()}`}
                                        onClick={() => selectTrack(item.id)}
                                        className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left transition-all md:px-4 ${
                                            active
                                                ? 'border-transparent bg-gradient-to-br from-[#0275FB] to-[#015CC8] text-white shadow-[0_10px_24px_-8px_rgba(2,117,251,0.7)]'
                                                : 'border-[#0275FB]/15 bg-[#F2F7FF] text-[#0F1B33] hover:border-[#0275FB]/50 hover:bg-white'
                                        }`}
                                    >
                                        <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-full sm:flex ${active ? 'bg-white/15 text-[#FDC908]' : 'bg-white text-[#0275FB]'}`}>
                                            <MaterialIcon name={item.icon} className="text-xl" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <MaterialIcon name={item.icon} className={`text-lg sm:hidden ${active ? 'text-[#FDC908]' : 'text-[#0275FB]'}`} />
                                                <span className="whitespace-nowrap text-sm font-black md:text-base">{TRACK_LABEL[item.id]}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${active ? 'bg-[#FDC908] text-[#0F1B33]' : 'bg-white text-[#0275FB]'}`}>
                                                    {done}/{list.length}
                                                </span>
                                            </span>
                                            <span className={`mt-0.5 hidden text-xs sm:block ${active ? 'text-white/80' : 'text-slate-500'}`}>{item.hint}</span>
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        {visible.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-1 text-xs font-bold text-slate-500">
                                <span>
                                    Đã hoàn thành <span className="text-[#0F1B33]">{completedCount}/{visible.length}</span> nhiệm vụ
                                </span>
                                <span className="flex items-center gap-1">
                                    <MaterialIcon name="stars" className="text-sm text-[#F5A800]" />
                                    <span className="text-[#0F1B33]">{earnedXp}</span> / {totalXp} XP
                                </span>
                            </div>
                        )}
                    </section>

                    {/* Mạch truyện 6 trạm nằm ở nhóm Tại di tích; nhắc ở nhóm Online để không ai tìm không ra. */}
                    {!loading && track === 'ONLINE' && byTrack.ONSITE.length > 0 && (
                        <button
                            type="button"
                            onClick={() => selectTrack('ONSITE')}
                            data-testid="journey-hint"
                            className="mb-6 flex w-full items-center gap-4 rounded-3xl border-2 border-[#FDC908]/70 bg-[#FFF8DC] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(2,117,251,0.6)] md:p-5"
                        >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDC908] text-[#0F1B33]">
                                <MaterialIcon name="auto_stories" className="text-2xl" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-base font-black text-[#0F1B33]">Hành trình 6 trạm · mỗi trạm một chương truyện</span>
                                <span className="block text-xs font-semibold text-[#8A6A00]">
                                    Nằm trong nhóm Tại di tích. Chưa tới nơi vẫn xem trước được từng trạm.
                                </span>
                            </span>
                            <MaterialIcon name="chevron_right" className="text-2xl text-[#0275FB]" />
                        </button>
                    )}

                    {loading && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-[240px] animate-pulse rounded-3xl border-2 border-[#0275FB]/10 bg-white/80" />
                            ))}
                        </div>
                    )}

                    {!loading && visible.length > 0 && (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6" role="tabpanel" data-testid="quest-list">
                            {visible.map((quest, index) => (
                                <QuestCard
                                    key={quest.id}
                                    quest={quest}
                                    index={index}
                                    locationCover={locationInfo?.coverImage}
                                    locationLocked={locationLocked}
                                    starting={startingId === quest.id}
                                    onStart={handleStart}
                                    onPremiumLock={setPremiumQuest}
                                />
                            ))}
                        </div>
                    )}

                    {!loading && track === 'ONSITE' && visible.length > 0 && (
                        <StoryJourneyPanel siteCode={siteCodeFromLocationId(locationId)} className="mt-6" />
                    )}

                    {!loading && visible.length === 0 && (
                        <div className="mt-6 rounded-3xl border-2 border-dashed border-[#0275FB]/30 bg-white/80 px-6 py-16 text-center">
                            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF2C3] text-[#0275FB]">
                                <MaterialIcon name={track === 'ONSITE' ? 'location_off' : 'travel_explore'} className="text-3xl" />
                            </span>
                            <h2 className="text-xl font-black text-[#0F1B33]">
                                {track === 'ONSITE' ? 'Chưa có nhiệm vụ Tại di tích' : 'Chưa có nhiệm vụ Online'}
                            </h2>
                            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                {track === 'ONSITE'
                                    ? `${locationInfo?.name || 'Di tích này'} chưa có lộ trình quét QR tại chỗ.`
                                    : 'Nội dung nhiệm vụ của di tích này đang được cập nhật.'}
                            </p>
                            {byTrack[track === 'ONSITE' ? 'ONLINE' : 'ONSITE'].length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => selectTrack(track === 'ONSITE' ? 'ONLINE' : 'ONSITE')}
                                    className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0275FB] px-5 text-sm font-black text-white"
                                >
                                    Xem nhiệm vụ {TRACK_LABEL[track === 'ONSITE' ? 'ONLINE' : 'ONSITE']}
                                </button>
                            )}
                        </div>
                    )}
                </main>
            </div>
            <PremiumContentModal
                open={premiumQuest !== null}
                onClose={() => setPremiumQuest(null)}
                title={premiumQuest?.title ?? 'Nội dung Premium'}
                next={premiumQuest ? `/quests/${premiumQuest.id}` : undefined}
                authenticated={isAuthenticated}
            />
        </AppLayout>
    )
}

function QuestCard({
    quest,
    index,
    locationCover,
    locationLocked,
    starting,
    onStart,
    onPremiumLock,
}: {
    quest: QuestV2Card
    index: number
    locationCover?: string | null
    locationLocked: boolean
    starting: boolean
    onStart: (quest: QuestV2Card, event: MouseEvent) => void
    onPremiumLock: (quest: QuestV2Card) => void
}) {
    const cover = pickQuestCover(quest.coverImage, locationCover, quest.title, index)
    const { requiredDone, requiredTotal, optionalTotal } = quest.progress
    const pct = requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0
    const meta = [quest.difficulty ? DIFFICULTY_LABEL[quest.difficulty] : null, quest.estimatedMinutes ? `${quest.estimatedMinutes} phút` : null]
        .filter(Boolean)
        .join(' · ')

    if (locationLocked) {
        return (
            <div className="relative flex min-h-[200px] flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white/70 p-6 text-center">
                <MaterialIcon name="lock" className="mb-3 text-3xl text-[#0275FB]" />
                <h2 className="text-lg font-black text-[#0F1B33]">{quest.title}</h2>
                <p className="mt-2 text-xs font-bold text-slate-500">Di tích này chưa mở với tài khoản của bạn.</p>
            </div>
        )
    }

    const isPremiumLocked = quest.status === 'LOCKED' && quest.lock?.reason === 'PREMIUM'

    return (
        <Link
            to={`/quests/${quest.id}`}
            data-testid="quest-card"
            data-status={quest.status}
            onClick={isPremiumLocked ? (e) => { e.preventDefault(); onPremiumLock(quest) } : undefined}
            className={`group relative flex flex-col overflow-hidden rounded-3xl border-2 bg-white shadow-[0_18px_44px_-16px_rgba(2,117,251,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0275FB]/60 sm:flex-row ${
                quest.status === 'COMPLETED' ? 'border-emerald-300' : quest.status === 'LOCKED' ? 'border-slate-200' : 'border-[#0275FB]/15'
            }`}
        >
            <div className="relative h-40 w-full shrink-0 overflow-hidden sm:h-auto sm:w-[34%]">
                <SmartImage
                    src={cover}
                    fallback={cover}
                    alt=""
                    fill
                    className={`object-cover transition-transform duration-700 group-hover:scale-105 ${quest.status === 'LOCKED' ? 'grayscale' : ''}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B33]/50 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-[#FDC908] px-2.5 py-1 text-[11px] font-black text-[#0F1B33] shadow">
                    <MaterialIcon name="stars" className="text-sm" /> +{quest.pointsReward} XP
                </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
                <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusPill quest={quest} />
                        {meta && <span className="text-[11px] font-bold text-[#0275FB]">{meta}</span>}
                    </div>
                    <h2 className="line-clamp-2 text-lg font-black leading-tight text-[#0F1B33] group-hover:text-[#0275FB] sm:text-xl">{quest.title}</h2>
                    {quest.description && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{quest.description}</p>}
                </div>

                <div className="mt-4 border-t-2 border-dashed border-[#0275FB]/15 pt-3">
                    {quest.status === 'LOCKED' && (
                        <p className="flex items-start gap-1.5 text-xs font-bold text-slate-500">
                            <MaterialIcon name="lock" className="text-sm" />
                            <span>{quest.lock?.message || 'Chưa mở'}</span>
                        </p>
                    )}

                    {quest.status === 'AVAILABLE' && (
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-slate-500">
                                {requiredDone > 0 ? `Đã có sẵn ${requiredDone}/${requiredTotal} bước` : `${requiredTotal} bước bắt buộc`}
                                {optionalTotal > 0 && ` · ${optionalTotal} tùy chọn`}
                            </span>
                            <button
                                type="button"
                                disabled={starting}
                                onClick={(event) => onStart(quest, event)}
                                className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FDC908] to-[#FFB800] px-4 text-xs font-black text-[#0F1B33] shadow-[0_8px_20px_-6px_rgba(253,201,8,0.8)] transition-transform hover:scale-105 disabled:opacity-60"
                            >
                                {starting ? 'Đang nhận…' : 'Nhận nhiệm vụ'}
                            </button>
                        </div>
                    )}

                    {quest.status === 'IN_PROGRESS' && (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                                <span className="text-[#0275FB]">
                                    {requiredDone}/{requiredTotal} bước bắt buộc
                                </span>
                                <span className="flex items-center text-[#0275FB]">
                                    Tiếp tục <MaterialIcon name="chevron_right" className="text-base" />
                                </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-[#DCEBFF]">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#0275FB] to-[#FDC908]" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    )}

                    {quest.status === 'COMPLETED' && (
                        <div className="flex items-center justify-between text-xs font-black">
                            <span className="flex items-center gap-1.5 text-emerald-700">
                                <MaterialIcon name="verified" className="text-base" /> Đã hoàn thành
                            </span>
                            <span className="flex items-center text-[#0275FB]">
                                Xem lại <MaterialIcon name="chevron_right" className="text-base" />
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}

function StatusPill({ quest }: { quest: QuestV2Card }) {
    const styles: Record<QuestV2Card['status'], { label: string; className: string; icon: string }> = {
        LOCKED: { label: 'Khóa', icon: 'lock', className: 'border-slate-200 bg-slate-100 text-slate-500' },
        AVAILABLE: { label: 'Chưa nhận', icon: 'flag', className: 'border-[#FDC908]/60 bg-[#FFF2C3] text-[#7A5B00]' },
        IN_PROGRESS: { label: 'Đang làm', icon: 'pending', className: 'border-[#0275FB]/30 bg-[#0275FB]/10 text-[#0275FB]' },
        COMPLETED: { label: 'Hoàn thành', icon: 'verified', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
    }
    const style = styles[quest.status]
    return (
        <span className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.className}`}>
            <MaterialIcon name={style.icon} className="text-[12px]" /> {style.label}
        </span>
    )
}
