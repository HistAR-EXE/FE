// src/features/story/StoryJourneyPanel.tsx
// "Hành trình 6 trạm": lộ trình tại di tích, mỗi trạm một chương truyện.
// Khi nhận nhiệm vụ Tại di tích, truyền `questSteps` vào để panel này là giao diện DUY NHẤT của nhiệm vụ
// (gộp tiến độ check-in + nội dung truyện), thay cho danh sách "Các bước" — tránh hai khối nói cùng một việc.
// Chương mở theo thứ tự check-in (quét QR), từ chương 3 cần Premium. Trạm premium bị chặn hoàn toàn từ ngoài.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { emitEvent } from '../../lib/pilotEvents'
import { useAuth } from '../../shared/auth/useAuth'
import { isPremium } from '../../shared/auth/types'
import { getSeededMinigameId } from '../minigames/api'
import { shortChapterTitle, stationMedia, storySeriesName } from '../stations/stationMedia'
import { stationDisplayName } from '../stations/StationNextSteps'
import type { QuestV2Step } from '../gamification/questsV2Api'
import { PremiumContentModal } from '../../components/monetization/PremiumContentModal'
import { storyApi, type StoryChapter } from './api'

type StoryJourneyPanelProps = {
    siteCode: string
    className?: string
    /** Bước của nhiệm vụ Tại di tích (khóa `station:ST0x`). Có thì panel hiển thị luôn tiến độ nhiệm vụ. */
    questSteps?: QuestV2Step[]
    /** XP khi hoàn thành nhiệm vụ, hiện ở đầu panel. */
    pointsReward?: number
}

/** Trạm nào đã check-in, lấy từ bước `station:ST0x` của nhiệm vụ. */
function doneStations(steps: QuestV2Step[] | undefined): Set<string> {
    const done = new Set<string>()
    for (const step of steps ?? []) {
        const code = /^station:(ST\d{2})$/i.exec(step.key)?.[1]
        if (code && step.state === 'DONE') done.add(code.toUpperCase())
    }
    return done
}

export function StoryJourneyPanel({ siteCode, className = '', questSteps, pointsReward }: StoryJourneyPanelProps) {
    const { isAuthenticated, user } = useAuth()
    const [chapters, setChapters] = useState<StoryChapter[]>([])
    const [premiumPopupChapter, setPremiumPopupChapter] = useState<StoryChapter | null>(null)

    useEffect(() => {
        let cancelled = false
        storyApi
            .chapters(siteCode)
            .then((list) => {
                if (!cancelled) setChapters([...list].sort((a, b) => a.chapterNumber - b.chapterNumber))
            })
            .catch(() => {
                if (!cancelled) setChapters([])
            })
        return () => {
            cancelled = true
        }
    }, [siteCode, isAuthenticated, user?.tier, user?.orgId])

    const paywallEmitted = useRef(false)
    const premiumLockedShown = chapters.some((c) => !c.unlocked && c.lockReason !== 'SEQUENCE')
    useEffect(() => {
        if (!premiumLockedShown || paywallEmitted.current) return
        paywallEmitted.current = true
        emitEvent('paywall_shown', { payload: { source: 'story_journey', siteCode } })
    }, [premiumLockedShown, siteCode])

    if (chapters.length === 0) return null

    const next = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/quests'
    const pricingHref = `/pricing?site=${encodeURIComponent(siteCode)}&next=${encodeURIComponent(next)}`
    const checkoutHref = isAuthenticated ? `/checkout/b2c?site=${encodeURIComponent(siteCode)}&next=${encodeURIComponent(next)}` : pricingHref
    const journeyPassHref = isAuthenticated
        ? `/checkout/b2c?plan=journey_pass&site=${encodeURIComponent(siteCode)}&next=${encodeURIComponent(next)}`
        : pricingHref
    const series = storySeriesName(chapters[0]?.title)
    const scanHref = `/scan?site=${encodeURIComponent(siteCode)}`
    // Chỉ MỘT con số: trạm đã check-in — khớp đúng tiến độ nhiệm vụ ("x/6 bước bắt buộc"), vì `chapter.completed`
    // và bước `station:ST0x` cùng lấy từ bảng check-ins. Không hiện "chương đã mở" nữa (chương 1 luôn mở sẵn nên
    // số đó lệch với tiến độ nhiệm vụ); trạng thái mở/khoá của từng chương đã thể hiện ngay trên dòng của nó.
    const asQuest = !!questSteps?.length
    const checkedIn = doneStations(questSteps)
    const isDone = (chapter: StoryChapter) => chapter.completed || checkedIn.has(chapter.stationCode.toUpperCase())
    const progressDone = chapters.filter(isDone).length

    return (
        <section
            id={`story-journey-${siteCode}`}
            data-testid="story-journey-panel"
            data-site={siteCode}
            className={`scroll-mt-24 overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-28px_rgba(2,117,251,0.5)] ring-1 ring-[#0275FB]/10 ${className}`}
        >
            <header className="bg-gradient-to-r from-[#0275FB] to-[#3B93FF] px-5 py-5 text-white sm:px-6">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#FFF2C3]">
                    <MaterialIcon name="auto_stories" className="text-base" /> Hành trình 6 trạm{series ? ` · ${series}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <h3 className="text-xl font-black leading-tight sm:text-2xl">Mỗi trạm một chương truyện</h3>
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                            {progressDone}/{chapters.length} trạm đã check-in
                        </span>
                        {asQuest && pointsReward ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FDC908] px-3 py-1 text-xs font-black text-[#0F1B33]">
                                <MaterialIcon name="stars" className="text-sm" /> +{pointsReward} XP khi đủ {chapters.length} trạm
                            </span>
                        ) : null}
                    </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
                    <div
                        className="h-full rounded-full bg-[#FDC908] transition-[width]"
                        style={{ width: `${(progressDone / chapters.length) * 100}%` }}
                    />
                </div>
                <p className="mt-3 text-xs font-semibold text-white/85">
                    Quét QR khi đứng ở trạm để tính bước và mở chương truyện. Chương 1–2 miễn phí, từ chương 3 cần Premium hoặc Journey Pass.
                </p>
            </header>

            <ol className="divide-y divide-slate-100">
                {chapters.map((chapter) => {
                    const locked = !chapter.unlocked
                    const media = stationMedia(siteCode, chapter.stationCode)
                    const stationName = stationDisplayName(chapter.stationCode, siteCode)
                    const stationHref = `/sites/${encodeURIComponent(siteCode)}/stations/${encodeURIComponent(chapter.stationCode)}/media`
                    const gameId = getSeededMinigameId(siteCode, chapter.stationCode)
                    const gameHref = gameId
                        ? `/sites/${encodeURIComponent(siteCode)}/stations/${encodeURIComponent(chapter.stationCode)}/game/${gameId}`
                        : null
                    // Ở chế độ nhiệm vụ, trạng thái của dòng là "đã check-in hay chưa" — đó cũng là bước của nhiệm vụ.
                    const done = isDone(chapter)
                    const isPremiumBlocked = chapter.requiresPremium && !chapter.completed && !isPremium(user)
                    // Chương mở tuần tự: cần check-in ở trạm của chương liền trước. Nói rõ tên trạm đó cho đỡ mơ hồ.
                    const previous = chapters.find((c) => c.chapterNumber === chapter.chapterNumber - 1)
                    const previousLabel = previous
                        ? `${previous.stationCode} ${stationDisplayName(previous.stationCode, siteCode)}`
                        : null
                    return (
                        <li
                            key={chapter.id}
                            data-testid={`story-chapter-${chapter.chapterNumber}`}
                            data-locked={locked}
                            data-done={done ? 'true' : 'false'}
                            className={`flex gap-4 p-4 sm:p-5 ${done ? 'bg-emerald-50/60' : ''}`}
                        >
                            {isPremiumBlocked ? (
                            <button
                                type="button"
                                onClick={() => setPremiumPopupChapter(chapter)}
                                className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#DCEBFF] sm:h-24 sm:w-32 cursor-pointer"
                                aria-label={`Trạm ${stationName} — cần Premium`}
                            >
                                {media ? (
                                    <img
                                        src={media.hero}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover brightness-50 saturate-0"
                                    />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[#0275FB]">
                                        <MaterialIcon name="location_on" className="text-3xl" />
                                    </span>
                                )}
                                <span className="absolute left-1.5 top-1.5 flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-black bg-[#0F1B33]/80 text-white">
                                    <MaterialIcon name="lock" className="text-sm" />
                                </span>
                            </button>
                            ) : (
                            <Link
                                to={stationHref}
                                className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#DCEBFF] sm:h-24 sm:w-32"
                                aria-label={`Xem trạm ${stationName}`}
                            >
                                {media ? (
                                    <img
                                        src={media.hero}
                                        alt=""
                                        loading="lazy"
                                        className={`h-full w-full object-cover ${locked ? 'brightness-75 saturate-50' : ''}`}
                                    />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[#0275FB]">
                                        <MaterialIcon name="location_on" className="text-3xl" />
                                    </span>
                                )}
                                <span
                                    className={`absolute left-1.5 top-1.5 flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-black ${
                                        locked ? 'bg-[#0F1B33]/80 text-white' : 'bg-[#FDC908] text-[#0F1B33]'
                                    }`}
                                >
                                    {locked ? <MaterialIcon name="lock" className="text-sm" /> : chapter.chapterNumber}
                                </span>
                            </Link>
                            )}

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-full bg-[#DCEBFF] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#0275FB]">
                                        Chương {chapter.chapterNumber} · {chapter.stationCode} {stationName}
                                    </span>
                                    {chapter.requiresPremium && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF2C3] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#8A6A00]">
                                            <MaterialIcon name="stars" className="text-[12px]" /> Premium
                                        </span>
                                    )}
                                    {done && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                            <MaterialIcon name="check_circle" className="text-[12px]" /> Đã check-in
                                        </span>
                                    )}
                                </div>
                                <h4
                                    className={`mt-1.5 text-base font-black leading-snug sm:text-lg ${locked ? 'text-slate-500' : 'text-[#0F1B33]'} ${isPremiumBlocked ? 'cursor-pointer' : ''}`}
                                    onClick={isPremiumBlocked ? () => setPremiumPopupChapter(chapter) : undefined}
                                >
                                    {shortChapterTitle(chapter.title)}
                                </h4>

                                {!locked && chapter.synopsis && <p className="mt-1 text-sm leading-relaxed text-slate-600">{chapter.synopsis}</p>}
                                {locked && chapter.lockReason === 'SEQUENCE' && (
                                    <p data-testid={`story-chapter-${chapter.chapterNumber}-sequence-hint`} className="mt-1 text-sm text-slate-500">
                                        {done ? 'Đã check-in trạm này. Nội dung chương mở sau khi bạn check-in' : 'Mở sau khi bạn check-in'}{' '}
                                        {previousLabel ? `trạm ${previousLabel}` : 'ở trạm trước'}, ngay tại di tích.
                                    </p>
                                )}
                                {isPremiumBlocked && (
                                    <p
                                        className="mt-1 cursor-pointer text-sm text-slate-500"
                                        onClick={() => setPremiumPopupChapter(chapter)}
                                    >
                                        Nội dung chương này dành cho Premium hoặc Journey Pass. <span className="font-bold text-[#0275FB]">Nâng cấp →</span>
                                    </p>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {!done && (
                                        isPremiumBlocked ? (
                                        <button
                                            type="button"
                                            onClick={() => setPremiumPopupChapter(chapter)}
                                            data-testid={`story-chapter-${chapter.chapterNumber}-scan`}
                                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#FDC908] px-3 text-xs font-black text-[#0F1B33] cursor-pointer"
                                        >
                                            <MaterialIcon name="qr_code_scanner" className="text-sm" /> Quét QR tại trạm
                                        </button>
                                        ) : (
                                        <Link
                                            to={scanHref}
                                            data-testid={`story-chapter-${chapter.chapterNumber}-scan`}
                                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#FDC908] px-3 text-xs font-black text-[#0F1B33]"
                                        >
                                            <MaterialIcon name="qr_code_scanner" className="text-sm" /> Quét QR tại trạm
                                        </Link>
                                        )
                                    )}
                                    {isPremiumBlocked ? (
                                    <button
                                        type="button"
                                        onClick={() => setPremiumPopupChapter(chapter)}
                                        data-testid={`story-chapter-${chapter.chapterNumber}-media`}
                                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#0275FB] px-3 text-xs font-black text-white cursor-pointer"
                                    >
                                        <MaterialIcon name="photo_library" className="text-sm" /> Xem trước trạm
                                    </button>
                                    ) : (
                                    <Link
                                        to={stationHref}
                                        data-testid={`story-chapter-${chapter.chapterNumber}-media`}
                                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#0275FB] px-3 text-xs font-black text-white"
                                    >
                                        <MaterialIcon name="photo_library" className="text-sm" /> {locked ? 'Xem trước trạm' : 'Xem trạm'}
                                    </Link>
                                    )}
                                    {done && gameHref && (
                                        <Link
                                            to={gameHref}
                                            data-testid={`story-chapter-${chapter.chapterNumber}-minigame`}
                                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border-2 border-[#0275FB]/20 bg-white px-3 text-xs font-black text-[#0275FB]"
                                        >
                                            <MaterialIcon name="sports_esports" className="text-sm" /> Mini-game trạm
                                        </Link>
                                    )}
                                    {locked && chapter.lockReason !== 'SEQUENCE' && (
                                        <>
                                            <Link
                                                to={checkoutHref}
                                                data-testid={`story-chapter-${chapter.chapterNumber}-cta`}
                                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#FDC908] px-3 text-xs font-black text-[#0F1B33]"
                                            >
                                                <MaterialIcon name="lock_open" className="text-sm" /> Premium tháng
                                            </Link>
                                            <Link
                                                to={journeyPassHref}
                                                className="inline-flex min-h-[36px] items-center rounded-xl border-2 border-[#FDC908]/70 bg-white px-3 text-xs font-black text-[#8A6A00]"
                                            >
                                                Journey Pass 72h
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ol>
            <PremiumContentModal
                open={premiumPopupChapter !== null}
                onClose={() => setPremiumPopupChapter(null)}
                title={premiumPopupChapter ? `Chương ${premiumPopupChapter.chapterNumber}: ${shortChapterTitle(premiumPopupChapter.title)}` : 'Nội dung Premium'}
                next={premiumPopupChapter ? `/sites/${encodeURIComponent(siteCode)}/stations/${encodeURIComponent(premiumPopupChapter.stationCode)}/media` : undefined}
                authenticated={isAuthenticated}
            />
            <footer className="border-t border-slate-100 bg-[#F7FAFF] px-5 py-3 text-xs text-slate-500 sm:px-6">
                Chưa tới di tích?{' '}
                <Link to={pricingHref} className="font-black text-[#0275FB]">
                    Xem các gói
                </Link>{' '}
                hoặc chơi nhiệm vụ Online để khám phá trước.
            </footer>
        </section>
    )
}
