// src/pages/MinigamePage.tsx
// Trang chơi mini game của bước nhiệm vụ: giới thiệu → chơi → kết quả (sao + dữ kiện có nguồn).
// BE chấm mọi lượt; lượt chưa xong (pending) trả gợi ý để engine phản hồi ngay.

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { analyticsApi } from '../features/analytics/api'
import { gamificationApi } from '../features/gamification/api'
import { QuestBackdrop } from '../features/gamification/QuestBackdrop'
import {
    isDevMinigameQuestVisible,
    minigameApi,
    type MinigameAttemptResult,
    type MinigameEngine,
    type MinigameView,
} from '../features/minigame/api'
import { ENGINE_META, levelNumber, type EngineProps, type GuideLine, type SubmitBody, type SubmitOutcome } from '../features/minigame/engineTypes'
import { DaoGapGame } from '../features/minigame/engines/DaoGapGame'
import { DemDauGame } from '../features/minigame/engines/DemDauGame'
import { DuongKhoiGame } from '../features/minigame/engines/DuongKhoiGame'
import { ImLangGame } from '../features/minigame/engines/ImLangGame'
import { PhongVanGame } from '../features/minigame/engines/PhongVanGame'
import { SoiNapGame } from '../features/minigame/engines/SoiNapGame'
import { XepTangGame } from '../features/minigame/engines/XepTangGame'
import { GuideBubble, IntroCard, ResultCard } from '../features/minigame/MinigameChrome'
import { isSfxMuted, setSfxMuted, sfx } from '../features/minigame/sfx'
import '../features/minigame/minigame.css'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'

const ENGINES: Record<MinigameEngine, ComponentType<EngineProps>> = {
    soi_nap: SoiNapGame,
    duong_khoi: DuongKhoiGame,
    xep_tang: XepTangGame,
    dao_gap: DaoGapGame,
    im_lang: ImLangGame,
    san_co_vat: DemDauGame,
    phong_van: PhongVanGame,
}

type Phase = 'loading' | 'intro' | 'play' | 'result' | 'error'

function preload(urls: (string | undefined)[]) {
    urls.filter(Boolean).forEach((url) => {
        const img = new Image()
        img.src = url as string
    })
}

export function MinigamePage() {
    const { questId, minigameId } = useParams<{ questId: string; minigameId: string }>()
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const { isAuthenticated } = useAuth()
    const { showToast } = useToast()
    const [game, setGame] = useState<MinigameView | null>(null)
    const [phase, setPhase] = useState<Phase>('loading')
    const [result, setResult] = useState<MinigameAttemptResult | null>(null)
    const [line, setLine] = useState<GuideLine | null>(null)
    const [round, setRound] = useState(0)
    const [muted, setMuted] = useState(isSfxMuted)
    const startedAt = useRef(0)
    const returnNarrative = searchParams.get('returnNarrative')
    const questHref = questId ? `/quests/${questId}` : '/quests'

    const load = useCallback(
        (id: string) =>
            minigameApi
                .open(id)
                .then((opened) => {
                    const meta = ENGINE_META[opened.engine]
                    preload([opened.view.imageUrl, opened.view.revealImageUrl, meta?.introImage, meta && `/images/characters/${meta.character}.png`])
                    setGame(opened)
                    setResult(null)
                    setLine(null)
                    setPhase('intro')
                })
                .catch(() => {
                    setPhase('error')
                    showToast({ message: 'Không mở được mini game.', type: 'error' })
                }),
        [showToast],
    )

    useEffect(() => {
        if (!minigameId || !isAuthenticated) return
        if (questId) void gamificationApi.startQuest(questId).catch(() => undefined)
        void load(minigameId)
    }, [minigameId, questId, isAuthenticated, load])

    const say = useCallback((next: GuideLine) => setLine(next), [])

    const start = () => {
        if (!game) return
        startedAt.current = performance.now()
        sfx.tap()
        setPhase('play')
        void analyticsApi.recordEvent({
            eventType: 'minigame_start',
            eventKey: game.id,
            source: 'minigame',
            metadata: { engine: game.engine, game_id: game.id, attempt_n: 0, duration_ms: 0 },
        })
    }

    const submit = useCallback(
        async (body: SubmitBody): Promise<SubmitOutcome> => {
            if (!game) return { kind: 'error' }
            const durationMs = Math.round(performance.now() - startedAt.current)
            try {
                const graded = await minigameApi.submit(game.id, { ...body, levelId: game.levelId, durationMs })
                if (graded.pending) return { kind: 'pending', hint: graded.hint ?? {} }
                void analyticsApi.recordEvent({
                    eventType: graded.passed ? 'minigame_done' : 'minigame_fail',
                    eventKey: game.id,
                    source: 'minigame',
                    metadata: { engine: game.engine, game_id: game.id, attempt_n: graded.attempts, duration_ms: durationMs, stars: graded.stars },
                })
                if (graded.discoveryRecorded) {
                    void analyticsApi.recordEvent({
                        eventType: 'chapter_done',
                        eventKey: game.id,
                        source: 'minigame',
                        metadata: { engine: game.engine, game_id: game.id, attempt_n: graded.attempts, duration_ms: durationMs, stars: graded.stars },
                    })
                }
                return { kind: 'done', result: graded }
            } catch {
                showToast({ message: 'Không gửi được lượt chơi. Kiểm tra kết nối rồi thử lại.', type: 'error' })
                return { kind: 'error' }
            }
        },
        [game, showToast],
    )

    const onResolved = useCallback((graded: MinigameAttemptResult) => {
        setResult(graded)
        setPhase('result')
    }, [])

    const replay = () => {
        if (!minigameId) return
        setPhase('loading')
        setRound((value) => value + 1)
        void load(minigameId)
    }

    const toggleMute = () => {
        setSfxMuted(!muted)
        setMuted(!muted)
    }

    const meta = game ? ENGINE_META[game.engine] : null
    const Engine = game ? ENGINES[game.engine] : null
    const levelNo = game ? levelNumber(game.levelId) : null
    const narrativeHref =
        returnNarrative && questId ? `/quests/${questId}?narrativeEvidence=${encodeURIComponent(returnNarrative)}` : null

    if (questId && !isDevMinigameQuestVisible(questId)) {
        return (
            <AppLayout activeBorder="left" mobileBackTo="/quests" mobileTitle="Mini game">
                <main className="p-8">Mật lệnh thử chỉ mở khi chạy web dev.</main>
            </AppLayout>
        )
    }

    return (
        <AppLayout
            activeBorder="left"
            topNav={<SimpleTopNav title="Mini game" backTo={questHref} backLabel="Về nhiệm vụ" />}
            mobileBackTo={questHref}
            mobileTitle={game?.title ?? 'Mini game'}
            className="min-h-screen !bg-[#DCEBFF] text-[#0F1B33]"
        >
            <QuestBackdrop />
            <div className="relative z-10 pt-14 md:pt-16">
                <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-24 pt-4 md:px-6 md:pt-8" data-testid="minigame-page">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0275FB] text-white shadow-[0_4px_0_#0159C2]">
                                <MaterialIcon name={meta?.icon ?? 'sports_esports'} className="text-2xl" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-widest text-[#0275FB]">
                                    Mini game{levelNo ? ` · Thử thách ${levelNo}` : ''}
                                </p>
                                <h1 className="truncate text-xl font-black text-[#0F1B33] md:text-2xl">{game?.title ?? 'Đang tải…'}</h1>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0F1B33] ring-1 ring-[#0275FB]/15"
                        >
                            <MaterialIcon name={muted ? 'volume_off' : 'volume_up'} />
                        </button>
                    </div>

                    {!isAuthenticated && (
                        <section className="rounded-3xl bg-white p-6 text-center ring-1 ring-[#0275FB]/10">
                            <p className="text-base font-black">Đăng nhập để chơi và tính điểm vào nhiệm vụ.</p>
                            <Link
                                to="/login"
                                state={{ from: `${location.pathname}${location.search}` }}
                                className="mt-4 inline-flex min-h-[44px] items-center rounded-2xl bg-[#0275FB] px-5 text-sm font-black text-white"
                            >
                                Đăng nhập
                            </Link>
                        </section>
                    )}

                    {isAuthenticated && phase === 'loading' && <div className="h-80 animate-pulse rounded-3xl bg-white/70" />}

                    {phase === 'error' && (
                        <section className="rounded-3xl bg-white p-6 text-center ring-1 ring-[#0275FB]/10">
                            <p className="text-base font-black">Không mở được mini game này.</p>
                            <p className="mt-1 text-sm text-slate-500">Có thể bạn cần nhận nhiệm vụ trước, hoặc mạng đang chập chờn.</p>
                            <Link to={questHref} className="mt-4 inline-flex min-h-[44px] items-center rounded-2xl bg-[#0275FB] px-5 text-sm font-black text-white">
                                Về nhiệm vụ
                            </Link>
                        </section>
                    )}

                    {game && meta && phase === 'intro' && (
                        <IntroCard
                            meta={meta}
                            title={game.title}
                            prompt={game.view.prompt}
                            levelNo={levelNo}
                            image={meta.introImage}
                            onStart={start}
                        />
                    )}

                    {game && meta && Engine && phase === 'play' && (
                        <>
                            {game.view.prompt && (
                                <p className="rounded-2xl bg-[#FFF2C3] px-4 py-2.5 text-sm font-bold text-[#5C4500]">{game.view.prompt}</p>
                            )}
                            <GuideBubble character={meta.character} line={line} />
                            <Engine key={`${game.levelId}-${round}`} view={game.view} submit={submit} onResolved={onResolved} say={say} />
                        </>
                    )}

                    {game && meta && phase === 'result' && result && (
                        <ResultCard
                            result={result}
                            character={meta.character}
                            onReplay={replay}
                            backHref={questHref}
                            backLabel="Về nhiệm vụ"
                            extra={
                                narrativeHref && result.passed ? (
                                    <Link
                                        to={narrativeHref}
                                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-[#FDC908] bg-[#FFF2C3] px-5 text-sm font-black text-[#0F1B33]"
                                    >
                                        <MaterialIcon name="folder_open" className="text-lg" /> Quay lại hồ sơ điều tra
                                    </Link>
                                ) : undefined
                            }
                        />
                    )}
                </main>
            </div>
        </AppLayout>
    )
}
