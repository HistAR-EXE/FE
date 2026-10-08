import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { analyticsApi } from '../features/analytics/api'
import { gamificationApi } from '../features/gamification/api'
import { minigameApi, isDevMinigameQuestVisible, type MinigameAttemptResult, type MinigameView } from '../features/minigame/api'
import { useAuth } from '../shared/auth/useAuth'
import { useToast } from '../shared/ui/toast/useToast'

type Drop = { itemId: string; floorId: string }
type Tap = { x: number; y: number; atMs: number }
type BrowserSpeech = {
    lang: string
    start: () => void
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
}

export function MinigamePage() {
    const { questId, minigameId } = useParams<{ questId: string; minigameId: string }>()
    const { isAuthenticated } = useAuth()
    const { showToast } = useToast()
    const [game, setGame] = useState<MinigameView | null>(null)
    const [result, setResult] = useState<MinigameAttemptResult | null>(null)
    const [busy, setBusy] = useState(false)
    const startedAt = useRef(0)

    useEffect(() => {
        if (!minigameId || !isAuthenticated) return
        if (questId) {
            void gamificationApi.startQuest(questId).catch(() => undefined)
        }
        void minigameApi.open(minigameId).then((opened) => {
            startedAt.current = performance.now()
            setGame(opened)
            setResult(null)
            void analyticsApi.recordEvent({
                eventType: 'minigame_start',
                eventKey: opened.id,
                source: 'minigame',
                metadata: { engine: opened.engine, game_id: opened.id, attempt_n: 0, duration_ms: 0 },
            })
            const url = opened.view.imageUrl
            if (url) {
                const img = new Image()
                img.src = url
            }
        }).catch(() => showToast({ message: 'Không mở được mini game.', type: 'error' }))
    }, [minigameId, questId, isAuthenticated, showToast])

    const finish = async (body: Omit<Parameters<typeof minigameApi.submit>[1], 'levelId'>) => {
        if (!game || busy) return
        setBusy(true)
        const durationMs = Math.round(performance.now() - startedAt.current)
        try {
            const graded = await minigameApi.submit(game.id, { ...body, levelId: game.levelId, durationMs })
            if (graded.pending) return
            setResult(graded)
            void analyticsApi.recordEvent({
                eventType: graded.passed ? 'minigame_done' : 'minigame_fail',
                eventKey: game.id,
                source: 'minigame',
                metadata: {
                    engine: game.engine,
                    game_id: game.id,
                    attempt_n: graded.attempts,
                    duration_ms: durationMs,
                    stars: graded.stars,
                },
            })
            if (graded.discoveryRecorded) {
                void analyticsApi.recordEvent({
                    eventType: 'chapter_done',
                    eventKey: game.id,
                    source: 'minigame',
                    metadata: { engine: game.engine, game_id: game.id, attempt_n: graded.attempts, duration_ms: durationMs, stars: graded.stars },
                })
            }
        } catch {
            showToast({ message: 'Không chấm được lượt chơi.', type: 'error' })
        } finally {
            setBusy(false)
        }
    }

    const replay = () => {
        if (!minigameId) return
        setResult(null)
        void minigameApi.open(minigameId).then((opened) => {
            startedAt.current = performance.now()
            setGame(opened)
        })
    }

    if (questId && !isDevMinigameQuestVisible(questId)) {
        return (
            <AppLayout activeBorder="left" mobileBackTo="/quests" mobileTitle="Mini game">
                <main className="p-8 text-white">Mật lệnh thử chỉ mở khi chạy web dev.</main>
            </AppLayout>
        )
    }

    return (
        <AppLayout activeBorder="left" mobileBackTo={questId ? `/quests/${questId}` : '/quests'} mobileTitle={game?.title ?? 'Mini game'}>
            <main className="mx-auto max-w-3xl px-4 py-8 text-white">
                <Link to={questId ? `/quests/${questId}` : '/quests'} className="text-sm text-[#fdb438]">Về mật lệnh</Link>
                {!isAuthenticated && <p className="mt-6">Đăng nhập để chơi.</p>}
                {game && (
                    <>
                        <h1 className="mt-4 text-2xl font-black">{game.title}</h1>
                        <p className="mt-2 text-sm text-gray-300">{game.view.prompt}</p>
                        {game.engine === 'xep_tang' && <XepTang view={game.view} disabled={busy || !!result} onSubmit={(drops) => void finish({ drops })} />}
                        {game.engine === 'soi_nap' && <SoiNap view={game.view} disabled={busy || !!result} onSubmit={(taps) => void finish({ taps })} />}
                        {game.engine === 'dao_gap' && <DaoGap view={game.view} disabled={busy || !!result} onSubmit={(angles) => void finish({ angles })} />}
                        {game.engine === 'san_co_vat' && <SanCoVat view={game.view} disabled={busy || !!result} onSubmit={(count) => void finish({ count })} />}
                        {game.engine === 'duong_khoi' && <DuongKhoi view={game.view} disabled={busy || !!result} onSubmit={(drops) => void finish({ drops })} />}
                        {game.engine === 'im_lang' && <ImLang view={game.view} disabled={busy || !!result} onSubmit={(body) => void finish(body)} />}
                        {game.engine === 'phong_van' && <PhongVan view={game.view} disabled={busy || !!result} onSubmit={(transcript) => void finish({ transcript })} />}
                        {result && (
                            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="font-black">{result.stars} sao</p>
                                {result.learnFact && <p className="mt-2 text-sm">Bạn vừa biết: {result.learnFact}</p>}
                                {result.discoveryRecorded && <p className="mt-2 text-sm text-[#fdb438]">+{result.discoveryXp} điểm khám phá</p>}
                                <button type="button" className="mt-4 rounded-xl bg-[#fe951c] px-4 py-2 text-sm font-black text-black" onClick={replay}>
                                    Chơi mức khác
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </AppLayout>
    )
}

function XepTang({ view, disabled, onSubmit }: { view: MinigameView['view']; disabled: boolean; onSubmit: (drops: Drop[]) => void }) {
    const drops = useRef<Drop[]>([])
    const [placed, setPlaced] = useState<Record<string, string>>({})
    const dragId = useRef<string | null>(null)

    const place = (itemId: string, floorId: string) => {
        drops.current = [...drops.current, { itemId, floorId }]
        setPlaced((prev) => ({ ...prev, [itemId]: floorId }))
    }

    return (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                {view.items?.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        disabled={disabled}
                        className="w-full touch-none rounded-xl border border-white/15 bg-[#161824] px-3 py-3 text-left text-sm"
                        onPointerDown={(event) => {
                            dragId.current = item.id
                            event.currentTarget.setPointerCapture(event.pointerId)
                        }}
                        onPointerUp={(event) => {
                            const target = document.elementFromPoint(event.clientX, event.clientY)
                            const floor = target?.closest('[data-floor-id]')?.getAttribute('data-floor-id')
                            if (dragId.current && floor) place(dragId.current, floor)
                            dragId.current = null
                        }}
                    >
                        {item.label}
                        {placed[item.id] && <span className="mt-1 block text-xs text-[#fdb438]">Đã thả</span>}
                    </button>
                ))}
            </div>
            <div className="space-y-2">
                {view.floors?.map((floor) => (
                    <div key={floor.id} data-floor-id={floor.id} className="min-h-20 rounded-xl border border-dashed border-white/20 p-3 text-sm">
                        {floor.label}
                    </div>
                ))}
                <button type="button" disabled={disabled} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black" onClick={() => onSubmit(drops.current)}>
                    Chấm
                </button>
            </div>
        </div>
    )
}

function SoiNap({ view, disabled, onSubmit }: { view: MinigameView['view']; disabled: boolean; onSubmit: (taps: Tap[]) => void }) {
    const taps = useRef<Tap[]>([])
    const started = useRef(0)
    const box = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        started.current = performance.now()
    }, [])

        const tap = (event: PointerEvent) => {
        if (disabled || !box.current) return
        const rect = box.current.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 100
        const y = ((event.clientY - rect.top) / rect.height) * 100
        const atMs = Math.round(performance.now() - started.current)
        taps.current = [...taps.current, { x, y, atMs }]
        onSubmit(taps.current)
    }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            onSubmit(taps.current.length ? taps.current : [{ x: -1, y: -1, atMs: 10001 }])
        }, 10000)
        return () => window.clearTimeout(timer)
        // Một vòng 10 giây cho mức đang mở.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <button ref={box} type="button" disabled={disabled} onPointerDown={tap} className="relative mt-6 block w-full overflow-hidden rounded-2xl border border-white/10">
            {view.imageUrl && <img src={view.imageUrl} alt="" className="w-full" />}
        </button>
    )
}

function DaoGap({ view, disabled, onSubmit }: { view: MinigameView['view']; disabled: boolean; onSubmit: (angles: number[]) => void }) {
    const [angle, setAngle] = useState(0)
    const angles = useRef<number[]>([])
    const min = view.angleMin ?? -60
    const max = view.angleMax ?? 60

    return (
        <div className="mt-6">
            <input
                type="range"
                min={min}
                max={max}
                value={angle}
                disabled={disabled}
                onChange={(event) => setAngle(Number(event.target.value))}
                className="w-full"
            />
            <p className="mt-2 text-sm">Hướng {angle}°</p>
            <button
                type="button"
                disabled={disabled}
                className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-black text-black"
                onClick={() => {
                    angles.current = [...angles.current, angle]
                    onSubmit(angles.current)
                }}
            >
                Gửi hướng
            </button>
        </div>
    )
}

function SanCoVat({ view, disabled, onSubmit }: { view: MinigameView['view']; disabled: boolean; onSubmit: (count: number) => void }) {
    const [count, setCount] = useState('0')

    return (
        <div className="mt-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
                {view.imageUrl && <img src={view.imageUrl} alt="Hình có các dấu cần đếm" className="w-full" />}
            </div>
            <label className="mt-4 block text-sm">
                Số dấu
                <input
                    type="number"
                    min={0}
                    value={count}
                    disabled={disabled}
                    onChange={(event) => setCount(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-[#161824] px-3 py-3"
                />
            </label>
            <button
                type="button"
                disabled={disabled}
                className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-black text-black"
                onClick={() => onSubmit(Number(count))}
            >
                Chấm
            </button>
        </div>
    )
}

function DuongKhoi({ view, disabled, onSubmit }: { view: MinigameView['view']; disabled: boolean; onSubmit: (drops: Drop[]) => void }) {
    const [turns, setTurns] = useState<Record<string, number>>({})
    const rotate = (id: string) => {
        setTurns((prev) => ({ ...prev, [id]: ((prev[id] ?? 0) + 1) % 4 }))
    }
    return (
        <div className="mt-6">
            <div className="grid grid-cols-2 gap-3">
                {view.cells?.map((cell) => (
                    <button
                        key={cell.id}
                        type="button"
                        disabled={disabled}
                        className="touch-none rounded-2xl border border-white/15 bg-[#161824] px-4 py-8 text-sm"
                        onPointerUp={() => rotate(cell.id)}
                    >
                        <span
                            className="inline-block text-3xl"
                            style={{ transform: `rotate(${(turns[cell.id] ?? 0) * 90}deg)` }}
                        >
                            {cell.kind === 'elbow' ? '└' : '─'}
                        </span>
                    </button>
                ))}
            </div>
            <button
                type="button"
                disabled={disabled}
                className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-black text-black"
                onClick={() => onSubmit((view.cells ?? []).map((cell) => ({ itemId: cell.id, floorId: String(turns[cell.id] ?? 0) })))}
            >
                Chấm
            </button>
        </div>
    )
}

function ImLang({
    view,
    disabled,
    onSubmit,
}: {
    view: MinigameView['view']
    disabled: boolean
    onSubmit: (body: { quietMs: number; baselineRms: number; peakRms: number; holdMs: number }) => void
}) {
    const [note, setNote] = useState('Đang đo tiếng nền…')
    const sent = useRef(false)
    const holdStart = useRef(0)
    const submitRef = useRef(onSubmit)

    useEffect(() => {
        submitRef.current = onSubmit
    }, [onSubmit])

    useEffect(() => {
        if (disabled) return
        sent.current = false
        let stopped = false
        let audio: AudioContext | null = null
        let raf = 0
        const streamRef: { current: MediaStream | null } = { current: null }
        const started = performance.now()
        const samples: number[] = []
        let baseline = 0
        let peak = 0
        let quiet = 0
        let last = started
        let calibrated = false
        const need = view.holdMs ?? 3000
        const margin = view.marginRatio ?? 1.8
        const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
        if (!getUserMedia) {
            setNote('Không có mic. Giữ nút bên dưới.')
            return
        }
        getUserMedia({ audio: true }).then((stream) => {
            if (stopped) {
                stream.getTracks().forEach((track) => track.stop())
                return
            }
            streamRef.current = stream
            audio = new AudioContext()
            const source = audio.createMediaStreamSource(stream)
            const analyser = audio.createAnalyser()
            analyser.fftSize = 1024
            source.connect(analyser)
            const data = new Uint8Array(analyser.fftSize)
            const tick = () => {
                if (stopped || sent.current) return
                analyser.getByteTimeDomainData(data)
                let sum = 0
                for (const value of data) {
                    const sample = (value - 128) / 128
                    sum += sample * sample
                }
                const rms = Math.sqrt(sum / data.length)
                const now = performance.now()
                if (!calibrated) {
                    samples.push(rms)
                    if (now - started >= 1500) {
                        baseline = samples.reduce((total, item) => total + item, 0) / samples.length
                        peak = rms
                        last = now
                        calibrated = true
                        setNote('Giữ im, hoặc giữ nút bên dưới.')
                    }
                } else {
                    peak = Math.max(peak, rms)
                    const limit = Math.max(0.02, baseline * margin)
                    if (rms <= limit) quiet += now - last
                    last = now
                    if (quiet >= need) {
                        sent.current = true
                        submitRef.current({ quietMs: Math.round(quiet), baselineRms: baseline, peakRms: peak, holdMs: 0 })
                        return
                    }
                }
                raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
        }).catch(() => setNote('Không có mic. Giữ nút bên dưới.'))
        return () => {
            stopped = true
            cancelAnimationFrame(raf)
            streamRef.current?.getTracks().forEach((track) => track.stop())
            void audio?.close()
        }
    }, [disabled, view.holdMs, view.marginRatio])

    return (
        <div className="mt-6">
            <p className="text-sm text-gray-300">{note}</p>
            <button
                type="button"
                disabled={disabled}
                className="mt-4 touch-none rounded-full bg-white px-6 py-6 text-sm font-black text-black"
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId)
                    holdStart.current = performance.now()
                }}
                onPointerUp={() => {
                    if (sent.current || disabled) return
                    sent.current = true
                    onSubmit({
                        quietMs: 0,
                        baselineRms: 0,
                        peakRms: 1,
                        holdMs: Math.round(performance.now() - holdStart.current),
                    })
                }}
            >
                Giữ ngón tay
            </button>
        </div>
    )
}

function PhongVan({ view, disabled, onSubmit }: { view: MinigameView['view']; disabled: boolean; onSubmit: (transcript: string) => void }) {
    const [text, setText] = useState('')
    const listen = () => {
        const host = window as Window & {
            SpeechRecognition?: new () => BrowserSpeech
            webkitSpeechRecognition?: new () => BrowserSpeech
        }
        const Speech = host.SpeechRecognition ?? host.webkitSpeechRecognition
        if (!Speech) return
        const recognition = new Speech()
        recognition.lang = 'vi-VN'
        recognition.onresult = (event) => {
            const said = event.results[0]?.[0]?.transcript ?? ''
            setText((prev) => (prev ? `${prev} ${said}` : said))
        }
        recognition.start()
    }
    return (
        <div className="mt-6 space-y-3">
            <ul className="list-disc pl-5 text-sm text-gray-300">
                {view.topics?.map((topic) => <li key={topic.label}>{topic.label}</li>)}
            </ul>
            <textarea
                value={text}
                disabled={disabled}
                onChange={(event) => setText(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-white/15 bg-[#161824] px-3 py-3"
                placeholder="Gõ câu trả lời, có thể không dấu"
            />
            <div className="flex gap-3">
                <button type="button" disabled={disabled} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black" onClick={listen}>
                    Nói
                </button>
                <button type="button" disabled={disabled} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black" onClick={() => onSubmit(text)}>
                    Gửi
                </button>
            </div>
        </div>
    )
}
