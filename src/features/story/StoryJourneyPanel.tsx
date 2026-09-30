// src/features/story/StoryJourneyPanel.tsx
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { useAuth } from '../../shared/auth/useAuth'
import { emitEvent } from '../../lib/pilotEvents'
import { SEEDED_MINIGAME_ID_BY_STATION } from '../minigames/api'
import { storyApi, type StoryChapter } from './api'

type StoryJourneyPanelProps = {
    siteCode: string
}

export function StoryJourneyPanel({ siteCode }: StoryJourneyPanelProps) {
    const { isAuthenticated, user } = useAuth()
    const [chapters, setChapters] = useState<StoryChapter[]>([])

    useEffect(() => {
        let cancelled = false
        storyApi
            .chapters(siteCode)
            .then((list) => {
                if (!cancelled) setChapters(list)
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
    const checkoutHref = isAuthenticated
        ? `/checkout/b2c?site=${encodeURIComponent(siteCode)}&next=${encodeURIComponent(next)}`
        : pricingHref
    const journeyPassHref = isAuthenticated
        ? `/checkout/b2c?plan=journey_pass&site=${encodeURIComponent(siteCode)}&next=${encodeURIComponent(next)}`
        : pricingHref

    return (
        <div
            id={`story-journey-${siteCode}`}
            data-testid="story-journey-panel"
            data-site={siteCode}
            className="relative mt-12 mb-12 scroll-mt-24"
        >
            <h3 className="font-black text-2xl text-white mb-2 flex items-center gap-3 border-b border-white/10 pb-4">
                <MaterialIcon name="auto_stories" className="text-[#fe951c] text-3xl drop-shadow-[0_0_8px_#fe951c]" />
                HÀNH TRÌNH 6 TRẠM
            </h3>
            <p className="mb-6 text-sm font-bold text-[#fdb438]">
                {chapters.filter((c) => c.unlocked).length}/{chapters.length} chương đã mở
                <span className="text-white/70 font-medium"> · Chương 1–2 miễn phí, từ chương 3 cần Premium / Journey Pass</span>
            </p>
            <p className="mb-4 text-xs text-gray-500">
                Mỗi chương mở video &amp; soundscape theo mã trạm (ST01–ST06), không dùng mã site.
            </p>

            <ol className="space-y-4">
                {chapters.map((chapter) => {
                    const locked = !chapter.unlocked
                    return (
                        <li
                            key={chapter.id}
                            data-testid={`story-chapter-${chapter.chapterNumber}`}
                            data-locked={locked}
                            className={`flex items-start gap-4 p-5 rounded-3xl border bg-[#161824]/80 ${
                                locked ? 'border-white/5' : 'border-[#fe951c]/30'
                            }`}
                        >
                            <div
                                className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border-2 font-black ${
                                    locked
                                        ? 'border-white/10 bg-black/60 text-gray-500'
                                        : 'border-[#fe951c] bg-[#fe951c]/10 text-[#fe951c]'
                                }`}
                            >
                                {locked ? <MaterialIcon name="lock" className="text-2xl" /> : chapter.chapterNumber}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-white/5 border-white/10 text-gray-400">
                                        Chương {chapter.chapterNumber} · {chapter.stationCode}
                                    </span>
                                    {chapter.requiresPremium && (
                                        <span className="px-2.5 py-1 rounded bg-[#fdb438]/10 border border-[#fdb438]/30 text-[#fdb438] text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <MaterialIcon name="stars" className="text-[12px]" /> PREMIUM
                                        </span>
                                    )}
                                </div>
                                <h4 className={`text-lg md:text-xl font-black leading-tight ${locked ? 'text-gray-400' : 'text-white'}`}>
                                    {chapter.title}
                                </h4>
                                {locked && chapter.lockReason === 'SEQUENCE' ? (
                                    <p
                                        data-testid={`story-chapter-${chapter.chapterNumber}-sequence-hint`}
                                        className="mt-3 text-sm text-gray-500 font-medium"
                                    >
                                        Hoàn thành chương trước (check-in tại trạm) để mở chương này.
                                    </p>
                                ) : locked ? (
                                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <p className="text-sm text-gray-500 font-medium">Nội dung chương này dành cho thành viên Premium.</p>
                                        <div className="flex gap-2">
                                            <Link
                                                to={checkoutHref}
                                                data-testid={`story-chapter-${chapter.chapterNumber}-cta`}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] text-black font-black text-xs uppercase tracking-widest"
                                            >
                                                <MaterialIcon name="lock_open" className="text-base" /> Premium tháng
                                            </Link>
                                            <Link
                                                to={journeyPassHref}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-400/40 text-emerald-300 font-bold text-xs uppercase tracking-widest hover:bg-emerald-500/10"
                                            >
                                                Journey Pass 72h
                                            </Link>
                                            <Link
                                                to={pricingHref}
                                                className="inline-flex items-center px-4 py-2 rounded-xl border border-white/20 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10"
                                            >
                                                Xem gói
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {chapter.synopsis && (
                                            <p className="mt-2 text-sm md:text-base text-gray-400 leading-relaxed font-medium">{chapter.synopsis}</p>
                                        )}
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <Link
                                                to={`/stations/${chapter.stationCode}/media`}
                                                data-testid={`story-chapter-${chapter.chapterNumber}-media`}
                                                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#388cf1] hover:text-white transition-colors"
                                            >
                                                <MaterialIcon name="play_circle" className="text-base" /> Video &amp; soundscape
                                            </Link>
                                            {SEEDED_MINIGAME_ID_BY_STATION[chapter.stationCode] && (
                                                <Link
                                                    to={`/stations/${chapter.stationCode}/game/${SEEDED_MINIGAME_ID_BY_STATION[chapter.stationCode]}`}
                                                    data-testid={`story-chapter-${chapter.chapterNumber}-minigame`}
                                                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#388cf1] hover:text-white transition-colors"
                                                >
                                                    <MaterialIcon name="sports_esports" className="text-base" /> Chơi mini-game trạm
                                                </Link>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
