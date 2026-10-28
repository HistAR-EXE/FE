import { QuestBackLink } from '../features/gamification/QuestBackLink'
// src/pages/QuestDetailPage.tsx
// Chi tiết một nhiệm vụ (API v2): điều kiện mở, tiến độ bước bắt buộc, danh sách bước theo trạng thái thật.
// Hồ sơ điều tra (nếu có) chạy song song bên dưới, không quyết định việc hoàn thành.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { EraLockedModal } from '../components/monetization/EraLockedModal'
import { PremiumContentModal } from '../components/monetization/PremiumContentModal'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { analyticsApi } from '../features/analytics/api'
import { collectionApi } from '../features/collection/api'
import { ArtifactViewerModal } from '../features/gamification/ArtifactViewerModal'
import { gamificationApi, type NarrativeInvestigation } from '../features/gamification/api'
import { DISCOVERY_RECORDED_EVENT, discoveryDeepLink } from '../features/gamification/discoveryRouting'
import { questLockKeyLabel } from '../features/gamification/questLockPresentation'
import { NarrativeInvestigationBoard } from '../features/gamification/NarrativeInvestigationBoard'
import { QuestBackdrop } from '../features/gamification/QuestBackdrop'
import { questStepAction } from '../features/gamification/questStepAction'
import { QuestStepList } from '../features/gamification/QuestStepList'
import {
    DIFFICULTY_LABEL,
    TRACK_LABEL,
    completionOutcome,
    questsV2Api,
    trackToParam,
    type QuestV2Card,
    type QuestV2Detail,
    type QuestV2Step,
} from '../features/gamification/questsV2Api'
import { shareProgressCard } from '../features/gamification/shareProgressCard'
import { locationsApi } from '../features/locations/api'
import { INTERVIEW_MINIGAME_ID, isDevMinigameQuestVisible } from '../features/minigame/api'
import { StoryJourneyPanel } from '../features/story/StoryJourneyPanel'
import { useVisitSession } from '../features/visit/VisitSessionProvider'
import { ApiError } from '../shared/api/contracts'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useAuth } from '../shared/auth/useAuth'
import { CU_CHI_LOCATION_ID, siteCodeFromLocationId } from '../shared/config/constants'
import { useUserProgress } from '../shared/context/UserProgressProvider'
import { pickQuestCover } from '../shared/media/resolveMedia'
import { SmartImage } from '../shared/ui/SmartImage'
import { useToast } from '../shared/ui/toast/useToast'

const NARRATIVE_PENDING_QUEST_ID = '33333333-3333-3333-3333-333333333338'

export function QuestDetailPage() {
    const { questId } = useParams<{ questId: string }>()
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const { applyEngagement } = useUserProgress()
    const { getSessionId } = useVisitSession()
    const { showToast } = useToast()

    const [detail, setDetail] = useState<QuestV2Detail | null>(null)
    const [notFound, setNotFound] = useState(false)
    const [locationName, setLocationName] = useState('')
    const [investigation, setInvestigation] = useState<NarrativeInvestigation | null>(null)
    const [narrativeNotice, setNarrativeNotice] = useState('')
    const [starting, setStarting] = useState(false)
    const [artifactStep, setArtifactStep] = useState<QuestV2Step | null>(null)
    const [paywallEra, setPaywallEra] = useState<number | null>(null)
    const [premiumPopup, setPremiumPopup] = useState(false)
    const [callOffer, setCallOffer] = useState(false)
    const reconciled = useRef(false)

    const load = useCallback(async () => {
        if (!questId) return
        try {
            const next = await questsV2Api.detail(questId)
            setDetail(next)
            setNotFound(false)
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) setNotFound(true)
            else showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
        }
    }, [questId, showToast])

    useEffect(() => {
        reconciled.current = false
        void load()
    }, [load, isAuthenticated])

    useEffect(() => {
        if (!questId) return
        let cancelled = false
        gamificationApi
            .investigation(questId)
            .then((value) => {
                if (cancelled) return
                setInvestigation(value)
                setNarrativeNotice('')
            })
            .catch((error) => {
                if (cancelled) return
                setInvestigation(null)
                setNarrativeNotice(
                    questId === NARRATIVE_PENDING_QUEST_ID && error instanceof ApiError && error.status === 404
                        ? 'Hồ sơ điều tra đang chờ duyệt nội dung. Bạn vẫn hoàn thành nhiệm vụ bằng các bước ở trên.'
                        : '',
                )
            })
        return () => {
            cancelled = true
        }
    }, [questId])

    const quest = detail?.quest ?? null
    const locationId = quest?.locationId ?? ''

    useEffect(() => {
        if (!locationId) return
        let cancelled = false
        locationsApi
            .getById(locationId)
            .then((loc) => {
                if (!cancelled) setLocationName(loc.name)
            })
            .catch(() => undefined)
        return () => {
            cancelled = true
        }
    }, [locationId])

    useEffect(() => {
        if (!questId) return
        let show = false
        try {
            show = localStorage.getItem(`histar-quest-call:${questId}`) !== '1'
        } catch {
            show = false
        }
        const timer = window.setTimeout(() => setCallOffer(show), 0)
        return () => window.clearTimeout(timer)
    }, [questId])

    // Đã đủ bước bắt buộc nhưng còn "Đang làm" (ví dụ do luật đổi) → hoàn thành ngay khi mở trang.
    useEffect(() => {
        if (!isAuthenticated || !quest || reconciled.current) return
        const { requiredDone, requiredTotal } = quest.progress
        if (quest.status !== 'IN_PROGRESS' || requiredTotal === 0 || requiredDone < requiredTotal) return
        reconciled.current = true
        void questsV2Api
            .reconcile(quest.locationId)
            .then((completed) => {
                const mine = completed.find((item) => item.questId === quest.id)
                if (mine) applyEngagement(completionOutcome(mine, quest))
                if (completed.length > 0) void load()
            })
            .catch(() => undefined)
    }, [isAuthenticated, quest, applyEngagement, load])

    useEffect(() => {
        if (!isAuthenticated || !questId) return
        const onRecorded = (event: Event) => {
            const recorded = (event as CustomEvent<{ recordKey: string; recorded: boolean }>).detail
            if (!recorded?.recorded) return
            if (quest?.status === 'IN_PROGRESS') {
                void analyticsApi.recordEvent({
                    locationId,
                    visitSessionId: locationId ? getSessionId(locationId) : undefined,
                    eventType: 'chapter_done',
                    eventKey: recorded.recordKey,
                    source: 'quest_detail',
                })
            }
            void load()
        }
        window.addEventListener(DISCOVERY_RECORDED_EVENT, onRecorded)
        return () => window.removeEventListener(DISCOVERY_RECORDED_EVENT, onRecorded)
    }, [isAuthenticated, questId, quest?.status, locationId, getSessionId, load])

    const startQuest = async () => {
        if (!questId) return
        if (!isAuthenticated) {
            navigate('/login')
            return
        }
        setStarting(true)
        try {
            const result = await questsV2Api.start(questId)
            void analyticsApi.recordEvent({ eventType: 'quest_start', eventKey: questId, locationId, source: 'quest_detail' })
            setDetail(result.detail)
            if (result.completed.length > 0) {
                result.completed.forEach((item) => applyEngagement(completionOutcome(item, result.detail.quest)))
            } else {
                showToast({ message: 'Đã nhận nhiệm vụ. Làm các bước theo thứ tự nào cũng được.', type: 'success' })
            }
        } catch (error) {
            showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
            void load()
        } finally {
            setStarting(false)
        }
    }

    const dismissCall = (listen: boolean) => {
        try {
            if (questId) localStorage.setItem(`histar-quest-call:${questId}`, '1')
        } catch {
            // Bộ nhớ trình duyệt bị chặn: chỉ ẩn trong phiên này.
        }
        setCallOffer(false)
        if (listen) {
            const params = new URLSearchParams({ call: '1' })
            if (locationId) params.set('locationId', locationId)
            navigate(`/chat?${params.toString()}`)
        }
    }

    const share = () => {
        if (!quest) return
        const { requiredDone, requiredTotal } = quest.progress
        const stars = requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 3) : 0
        void collectionApi
            .mine(locationId || CU_CHI_LOCATION_ID)
            .then((mine) =>
                shareProgressCard({
                    title: quest.title,
                    stars,
                    collected: mine.collected,
                    total: mine.total,
                    premiumCollected: mine.collectedPremium ?? 0,
                    premiumTotal: mine.totalPremium ?? 0,
                }),
            )
            .catch(() =>
                shareProgressCard({ title: quest.title, stars, collected: requiredDone, total: requiredTotal, premiumCollected: 0, premiumTotal: 0 }),
            )
    }

    useEffect(() => {
        if (quest?.lock?.reason === 'PREMIUM') setPremiumPopup(true)
    }, [quest?.lock?.reason])

    if (questId && !isDevMinigameQuestVisible(questId)) {
        return (
            <AppLayout hideTopNav mobileBackTo="/quests" mobileTitle="Nhiệm vụ">
                <main className="p-8"><QuestBackLink to="/quests" label="Danh sách nhiệm vụ" />Nhiệm vụ thử chỉ mở khi chạy web dev.</main>
            </AppLayout>
        )
    }

    const listHref = quest ? `/quests?locationId=${quest.locationId}&track=${trackToParam(quest.track)}` : '/quests'
    // Lộ trình 6 trạm: nhiệm vụ Tại di tích mà mọi bước đều là trạm → dùng panel Hành trình 6 trạm làm giao diện duy nhất.
    const stationJourney =
        quest?.track === 'ONSITE' &&
        !!detail?.steps.length &&
        detail.steps.every((step) => /^station:ST\d{2}$/i.test(step.key))

    return (
        <AppLayout
            hideTopNav
            activeBorder="left"
            mobileBackTo={listHref}
            mobileTitle="Nhiệm vụ"
            className="min-h-screen !bg-[#DCEBFF] text-[#0F1B33]"
        >
            <QuestBackdrop />

            <div className="relative z-10">
                <div className="mx-auto w-full max-w-5xl px-4 md:px-8"><QuestBackLink to={listHref} label="Danh sách nhiệm vụ" /></div>
                {notFound && (
                    <div className="mx-auto max-w-xl px-4 py-24 text-center">
                        <h1 className="text-2xl font-black">Không tìm thấy nhiệm vụ</h1>
                        <Link to="/quests" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[#0275FB] px-5 text-sm font-black text-white">
                            Về danh sách nhiệm vụ
                        </Link>
                    </div>
                )}

                {!notFound && !quest && (
                    <div className="mx-auto max-w-5xl px-4 pt-8">
                        <div className="h-64 animate-pulse rounded-3xl bg-white/70" />
                    </div>
                )}

                {quest && detail && (
                    <>
                        <QuestHero quest={quest} locationName={locationName} />

                        <main className="relative z-20 mx-auto w-full max-w-5xl space-y-8 px-4 pb-16 md:px-8">
                            <StatusPanel
                                quest={quest}
                                steps={detail.steps}
                                isAuthenticated={isAuthenticated}
                                starting={starting}
                                onStart={startQuest}
                                onOpenArtifact={setArtifactStep}
                                onPremiumPopup={() => setPremiumPopup(true)}
                            />

                            {callOffer && (
                                <section className="flex flex-col gap-3 rounded-3xl border-2 border-[#FDC908]/60 bg-[#FFF2C3] p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-black text-[#0F1B33]">Chrono đang gọi</p>
                                        <p className="mt-0.5 text-xs text-[#7A5B00]">Nghe Chrono giới thiệu nhiệm vụ. Lời mời chỉ hiện lần đầu.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => dismissCall(false)} className="min-h-[44px] rounded-xl bg-white px-4 text-xs font-black text-[#0F1B33]">
                                            Bỏ qua
                                        </button>
                                        <button type="button" onClick={() => dismissCall(true)} className="min-h-[44px] rounded-xl bg-[#0275FB] px-4 text-xs font-black text-white">
                                            Nghe
                                        </button>
                                    </div>
                                </section>
                            )}

                            {/* Nhiệm vụ "6 trạm": panel Hành trình 6 trạm là giao diện duy nhất (bước = chương),
                                không liệt kê "Các bước" nữa để hai khối không nói cùng một việc. */}
                            {!stationJourney && (
                                <section aria-labelledby="quest-steps-title">
                                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                                        <h2 id="quest-steps-title" className="text-xl font-black text-[#0F1B33]">
                                            Các bước
                                        </h2>
                                        <p className="text-xs font-bold text-slate-500">Làm theo thứ tự nào cũng được</p>
                                    </div>
                                    <QuestStepList
                                        quest={quest}
                                        steps={detail.steps}
                                        onOpenArtifact={setArtifactStep}
                                        onPremium={(step) => setPaywallEra(step.portalEra ?? 1948)}
                                    />
                                </section>
                            )}

                            {stationJourney && locationId && (
                                <StoryJourneyPanel
                                    siteCode={siteCodeFromLocationId(locationId)}
                                    questSteps={detail.steps}
                                    pointsReward={quest.pointsReward}
                                />
                            )}

                            {narrativeNotice && (
                                <div role="status" className="rounded-2xl border border-[#FDC908]/60 bg-[#FFF2C3] p-4 text-sm font-medium text-[#7A5B00]">
                                    {narrativeNotice}
                                </div>
                            )}

                            {investigation && (
                                <section aria-labelledby="quest-investigation-title">
                                    <h2 id="quest-investigation-title" className="text-xl font-black text-[#0F1B33]">
                                        Hồ sơ điều tra
                                    </h2>
                                    <p className="mt-1 text-xs font-bold text-slate-500">Không bắt buộc · có tiến độ và XP riêng, không ảnh hưởng việc hoàn thành nhiệm vụ.</p>
                                    <NarrativeInvestigationBoard investigation={investigation} locationId={locationId} />
                                </section>
                            )}

                            <RewardPanel quest={quest} detail={detail} />

                            <div className="flex flex-wrap gap-2">
                                {locationId === CU_CHI_LOCATION_ID && (
                                    <Link
                                        to={`/quests/${quest.id}/play/${INTERVIEW_MINIGAME_ID}`}
                                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#0275FB]/25 bg-white px-4 text-xs font-black text-[#0275FB]"
                                    >
                                        <MaterialIcon name="mic" className="text-base" /> Phỏng vấn nhân chứng
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={share}
                                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#0275FB]/25 bg-white px-4 text-xs font-black text-[#0275FB]"
                                >
                                    <MaterialIcon name="share" className="text-base" /> Chia sẻ tiến độ
                                </button>
                            </div>

                            {/* Nhiệm vụ Tại di tích khác (không phải lộ trình 6 trạm) vẫn xem được mạch truyện. */}
                            {quest.track === 'ONSITE' && !stationJourney && locationId && (
                                <StoryJourneyPanel siteCode={siteCodeFromLocationId(locationId)} />
                            )}
                        </main>
                    </>
                )}
            </div>

            {artifactStep && locationId && (
                <ArtifactViewerModal step={artifactStep} locationId={locationId} onClose={() => setArtifactStep(null)} />
            )}

            <PremiumContentModal
                open={premiumPopup}
                onClose={() => setPremiumPopup(false)}
                title={quest?.title ?? 'Nội dung Premium'}
                next={`/quests/${questId ?? ''}`}
                authenticated={isAuthenticated}
            />

            <EraLockedModal
                open={paywallEra !== null}
                onClose={() => setPaywallEra(null)}
                eraLabel={paywallEra ?? undefined}
                pricingHref={`/pricing?next=${encodeURIComponent(`/quests/${questId ?? ''}`)}`}
                onUpgradeClick={() =>
                    void analyticsApi.recordEvent({ eventType: 'PAYWALL_ERA_UPGRADE_CLICK', locationId: locationId || undefined, source: 'quest_detail' })
                }
                message="Bước này là tùy chọn. Bạn vẫn hoàn thành nhiệm vụ khi xong các bước bắt buộc."
            />
        </AppLayout>
    )
}

function QuestHero({ quest, locationName }: { quest: QuestV2Card; locationName: string }) {
    const cover = pickQuestCover(quest.coverImage, undefined, quest.title, 0)
    const chips = [
        { icon: quest.track === 'ONSITE' ? 'location_on' : 'public', label: TRACK_LABEL[quest.track] },
        quest.difficulty ? { icon: 'speed', label: DIFFICULTY_LABEL[quest.difficulty] } : null,
        quest.estimatedMinutes ? { icon: 'schedule', label: `${quest.estimatedMinutes} phút` } : null,
        { icon: 'stars', label: `+${quest.pointsReward} XP` },
    ].filter((chip): chip is { icon: string; label: string } => chip !== null)

    return (
        <section className="relative w-full overflow-hidden rounded-b-[2.5rem] shadow-[0_24px_60px_-18px_rgba(2,117,251,0.55)]">
            <div className="absolute inset-0">
                <SmartImage src={cover} fallback={cover} alt="" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0275FB] via-[#0275FB]/88 to-[#0275FB]/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#015CC8]/70 via-transparent to-transparent" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-[#FDC908] via-[#FFF2C3] to-[#FDC908]" />
            <div className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-8 md:px-8 md:pb-20 md:pt-14">
                {locationName && (
                    <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white">
                        <MaterialIcon name="location_on" className="text-sm text-[#FDC908]" /> {locationName}
                    </p>
                )}
                <h1 className="text-3xl font-black leading-tight tracking-tight text-white drop-shadow md:text-5xl">{quest.title}</h1>
                {quest.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 md:text-base">{quest.description}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                    {chips.map((chip) => (
                        <span key={chip.label} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#0F1B33] shadow">
                            <MaterialIcon name={chip.icon} className="text-sm text-[#0275FB]" /> {chip.label}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    )
}

function StatusPanel({
    quest,
    steps,
    isAuthenticated,
    starting,
    onStart,
    onOpenArtifact,
    onPremiumPopup,
}: {
    quest: QuestV2Card
    steps: QuestV2Step[]
    isAuthenticated: boolean
    starting: boolean
    onStart: () => void
    onOpenArtifact: (step: QuestV2Step) => void
    onPremiumPopup?: () => void
}) {
    const { requiredDone, requiredTotal, optionalDone, optionalTotal } = quest.progress
    const pct = requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0
    const nextStep = steps.find((step) => step.id === quest.nextStepId) ?? null

    return (
        <section data-testid="quest-status" data-status={quest.status} className="-mt-10 rounded-3xl border-2 border-[#0275FB]/20 bg-white p-5 shadow-[0_24px_60px_-18px_rgba(2,117,251,0.4)] md:p-6">
            {quest.status === 'LOCKED' && quest.lock && (
                <div>
                    <p className="flex items-center gap-2 text-sm font-black text-[#0F1B33]">
                        <MaterialIcon name="lock" className="text-xl text-[#0275FB]" /> Nhiệm vụ đang khóa
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{quest.lock.message}</p>
                    {quest.lock.reason === 'PREMIUM' && <button type="button" onClick={() => onPremiumPopup?.()} className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">Xem gói Premium</button>}
                    {quest.lock.afterQuest && (
                        <Link
                            to={`/quests/${quest.lock.afterQuest.id}`}
                            className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#0275FB] px-4 text-sm font-black text-white"
                        >
                            Mở “{quest.lock.afterQuest.title}” <MaterialIcon name="chevron_right" className="text-base" />
                        </Link>
                    )}
                    {quest.lock.keys.length > 0 && (
                        <ul className="mt-3 space-y-3">
                            {quest.lock.keys.map((key, index) => (
                                <li key={key.key} className="flex items-start gap-3 text-sm">
                                    <MaterialIcon
                                        name={key.done ? 'check_circle' : 'radio_button_unchecked'}
                                        className={`mt-0.5 text-lg ${key.done ? 'text-emerald-600' : 'text-slate-400'}`}
                                    />
                                    <div className="min-w-0">
                                        <p className={key.done ? 'text-slate-500 line-through' : 'font-bold text-[#0F1B33]'}>
                                            {questLockKeyLabel(key, quest.locationId, index)}
                                        </p>
                                        {!key.done && key.key.startsWith('scene:') && (
                                            <Link to={discoveryDeepLink(quest.locationId, key.key)} className="mt-1 inline-flex min-h-8 items-center gap-1 font-bold text-[#0275FB] hover:underline">
                                                Khám phá cảnh 360° <MaterialIcon name="arrow_forward" className="text-base" />
                                            </Link>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {quest.status === 'AVAILABLE' && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-black text-[#0F1B33]">
                            {requiredTotal} bước bắt buộc{optionalTotal > 0 && ` · ${optionalTotal} bước tùy chọn`}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                            {requiredDone > 0
                                ? `Bạn đã có sẵn ${requiredDone}/${requiredTotal} bước bắt buộc — nhận nhiệm vụ là được tính ngay.`
                                : 'Nhận nhiệm vụ rồi làm từng bước bên dưới.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onStart}
                        disabled={starting}
                        aria-label="Nhận nhiệm vụ"
                        className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FDC908] to-[#FFB800] px-6 text-sm font-black text-[#0F1B33] shadow-[0_8px_20px_-6px_rgba(253,201,8,0.8)] disabled:opacity-60"
                    >
                        <MaterialIcon name={isAuthenticated ? 'flag' : 'login'} className="text-lg" />
                        {starting ? 'Đang nhận…' : isAuthenticated ? 'Nhận nhiệm vụ' : 'Đăng nhập để nhận'}
                    </button>
                </div>
            )}

            {(quest.status === 'IN_PROGRESS' || quest.status === 'COMPLETED') && (
                <div>
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <p className="text-sm font-black text-[#0F1B33]">
                            {quest.status === 'COMPLETED' ? (
                                <span className="flex items-center gap-1.5 text-emerald-700">
                                    <MaterialIcon name="verified" className="text-xl" /> Đã hoàn thành
                                    {quest.completedAt && <span className="font-bold text-slate-500">· {formatDate(quest.completedAt)}</span>}
                                </span>
                            ) : (
                                'Đang làm'
                            )}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                            <span className="text-base font-black text-[#0F1B33]">
                                {requiredDone}/{requiredTotal}
                            </span>{' '}
                            bước bắt buộc
                            {optionalTotal > 0 && ` · tùy chọn ${optionalDone}/${optionalTotal}`}
                        </p>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#DCEBFF]">
                        <div
                            className={`h-full rounded-full ${quest.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#0275FB] to-[#FDC908]'}`}
                            style={{ width: `${quest.status === 'COMPLETED' ? 100 : pct}%` }}
                        />
                    </div>
                    {quest.status === 'IN_PROGRESS' && nextStep && <NextStepCta quest={quest} step={nextStep} onOpenArtifact={onOpenArtifact} />}
                </div>
            )}
        </section>
    )
}

function NextStepCta({ quest, step, onOpenArtifact }: { quest: QuestV2Card; step: QuestV2Step; onOpenArtifact: (step: QuestV2Step) => void }) {
    const action = questStepAction(step, { questId: quest.id, locationId: quest.locationId })
    const className =
        'mt-4 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl bg-[#0275FB] px-4 text-left text-white shadow-[0_10px_24px_-10px_rgba(2,117,251,0.8)] hover:bg-[#015CC8]'
    const content = (
        <>
            <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider text-white/70">Bước tiếp theo</span>
                <span className="block truncate text-sm font-black">{step.title}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-black text-[#FDC908]">
                {action.label} <MaterialIcon name="arrow_forward" className="text-base" />
            </span>
        </>
    )
    if (action.kind === 'link') {
        return (
            <Link to={action.href} className={className}>
                {content}
            </Link>
        )
    }
    if (action.kind === 'artifact') {
        return (
            <button type="button" onClick={() => onOpenArtifact(step)} className={className}>
                {content}
            </button>
        )
    }
    return null
}

function RewardPanel({ quest, detail }: { quest: QuestV2Card; detail: QuestV2Detail }) {
    const rewards = detail.rewardSummary?.rewards ?? []
    const explore = rewards.find((reward) => reward.type === 'EXPLORE_XP')?.xp ?? 10
    const chapter = rewards.find((reward) => reward.type === 'CHAPTER_REWARD')?.xp
    const completion = rewards.find((reward) => reward.type === 'QUEST_COMPLETION_REWARD')?.xp ?? quest.pointsReward

    return (
        <section className="rounded-3xl border-2 border-[#0275FB]/15 bg-white p-5" aria-labelledby="quest-rewards-title">
            <h2 id="quest-rewards-title" className="text-base font-black text-[#0F1B33]">
                Phần thưởng
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                <RewardItem icon="explore" xp={explore} label="Mỗi điểm khám phá mới" />
                {chapter !== undefined && <RewardItem icon="extension" xp={chapter} label="Thử thách có thưởng (một lần)" />}
                <RewardItem icon="emoji_events" xp={completion} label="Hoàn thành nhiệm vụ (một lần)" />
            </ul>
        </section>
    )
}

function RewardItem({ icon, xp, label }: { icon: string; xp: number; label: string }) {
    return (
        <li className="flex items-center gap-3 rounded-2xl bg-[#F2F7FF] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FDC908] text-[#0F1B33]">
                <MaterialIcon name={icon} className="text-xl" />
            </span>
            <span>
                <span className="block text-base font-black text-[#0F1B33]">+{xp} XP</span>
                <span className="block text-[11px] font-bold text-slate-500">{label}</span>
            </span>
        </li>
    )
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('vi-VN')
    } catch {
        return ''
    }
}
