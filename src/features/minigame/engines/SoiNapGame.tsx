// src/features/minigame/engines/SoiNapGame.tsx
// Soi nắp: tìm nắp hầm ngụy trang trên ảnh chụp thật. Mỗi lần chạm gửi lên BE;
// chạm hụt nhận gợi ý nóng/lạnh (BE không lộ toạ độ), hụt 3 lần hoặc hết 10 giây là bị lộ.

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import type { MinigameAttemptResult } from '../api'
import type { EngineProps } from '../engineTypes'
import { HudChip, TimerBar } from '../MinigameChrome'
import { buzz, sfx } from '../sfx'

type Warmth = 'HOT' | 'WARM' | 'COLD'
type Tap = { x: number; y: number; atMs: number }
type Mark = { id: number; x: number; y: number; warmth: Warmth | null }

const MAX_EXPOSURES = 3

const WARMTH_LINE: Record<Warmth, string> = {
    HOT: 'Nóng lắm! Nắp hầm ở ngay sát chỗ vừa chạm.',
    WARM: 'Ấm rồi, quanh quanh chỗ này thôi.',
    COLD: 'Lạnh. Nắp hầm không ở gần đây.',
}
const WARMTH_LABEL: Record<Warmth, string> = { HOT: 'Nóng', WARM: 'Ấm', COLD: 'Lạnh' }
const WARMTH_DOT: Record<Warmth, string> = {
    HOT: 'bg-red-500 ring-red-200/80',
    WARM: 'bg-orange-400 ring-orange-100/80',
    COLD: 'bg-sky-500 ring-sky-100/80',
}

const round1 = (value: number) => Math.round(value * 10) / 10

export function SoiNapGame({ view, submit, onResolved, say }: EngineProps) {
    const limit = view.timeLimitMs ?? 10_000
    const startRef = useRef(0)
    const tapsRef = useRef<Tap[]>([])
    const busyRef = useRef(false)
    const doneRef = useRef(false)
    const seqRef = useRef(0)
    const lastTickRef = useRef(0)
    const timeoutRef = useRef<() => void>(() => undefined)
    const [marks, setMarks] = useState<Mark[]>([])
    const [leftMs, setLeftMs] = useState(limit)
    const [exposures, setExposures] = useState(0)
    const [phase, setPhase] = useState<'play' | 'found' | 'lost'>('play')
    const [foundAt, setFoundAt] = useState<{ x: number; y: number } | null>(null)
    const [shaking, setShaking] = useState(false)

    const finish = (result: MinigameAttemptResult, at: { x: number; y: number } | null) => {
        if (doneRef.current) return
        doneRef.current = true
        if (result.stars > 0 && at) {
            setPhase('found')
            setFoundAt(at)
            sfx.win()
            buzz([30, 40, 60])
            say({ text: 'Đúng nó rồi! Nắp hầm được phủ lá khô nên nhìn từ trên rất khó thấy.' })
            window.setTimeout(() => onResolved(result), 1900)
        } else {
            setPhase('lost')
            sfx.lose()
            buzz(200)
            say({ text: 'Bị lộ rồi! Lần sau nhìn kỹ những mép lá nằm thẳng bất thường.', mood: 'surprised' })
            window.setTimeout(() => onResolved(result), 1500)
        }
    }

    const timeout = async () => {
        if (doneRef.current || busyRef.current) return
        busyRef.current = true
        const outcome = await submit({ taps: [...tapsRef.current, { x: -1, y: -1, atMs: limit + 1 }] })
        busyRef.current = false
        if (outcome.kind === 'done') finish(outcome.result, null)
    }

    useEffect(() => {
        timeoutRef.current = () => void timeout()
    })

    useEffect(() => {
        startRef.current = performance.now()
        say({ text: 'Nhìn kỹ chỗ lá nằm bất thường, có mép gỗ hay khe tối. Chạm vào nắp hầm!' })
    }, [say])

    useEffect(() => {
        if (phase !== 'play') return
        const id = window.setInterval(() => {
            const remaining = limit - (performance.now() - startRef.current)
            setLeftMs(Math.max(0, remaining))
            const second = Math.ceil(remaining / 1000)
            if (remaining > 0 && second <= 3 && second !== lastTickRef.current) {
                lastTickRef.current = second
                sfx.tick()
            }
            if (remaining <= 0) {
                window.clearInterval(id)
                timeoutRef.current()
            }
        }, 100)
        return () => window.clearInterval(id)
    }, [phase, limit])

    const onTap = async (event: PointerEvent<HTMLDivElement>) => {
        if (phase !== 'play' || busyRef.current || doneRef.current) return
        const rect = event.currentTarget.getBoundingClientRect()
        const x = round1(((event.clientX - rect.left) / rect.width) * 100)
        const y = round1(((event.clientY - rect.top) / rect.height) * 100)
        const atMs = Math.round(performance.now() - startRef.current)
        const id = ++seqRef.current
        tapsRef.current = [...tapsRef.current, { x, y, atMs }]
        busyRef.current = true
        sfx.tap()
        setMarks((current) => [...current, { id, x, y, warmth: null }])
        const outcome = await submit({ taps: tapsRef.current })
        busyRef.current = false
        if (outcome.kind === 'error') {
            tapsRef.current = tapsRef.current.slice(0, -1)
            setMarks((current) => current.filter((mark) => mark.id !== id))
            return
        }
        if (outcome.kind === 'pending') {
            const warmth = outcome.hint.warmth ?? 'COLD'
            const used = outcome.hint.exposures ?? tapsRef.current.length
            setMarks((current) => current.map((mark) => (mark.id === id ? { ...mark, warmth } : mark)))
            setExposures(used)
            setShaking(true)
            window.setTimeout(() => setShaking(false), 460)
            sfx.bad()
            buzz(70)
            const left = MAX_EXPOSURES - used
            say({ text: `${WARMTH_LINE[warmth]} Còn ${left} lần chạm.`, mood: warmth === 'HOT' ? 'happy' : 'surprised' })
            return
        }
        finish(outcome.result, { x, y })
    }

    const seconds = Math.ceil(leftMs / 1000)
    const urgent = phase === 'play' && leftMs <= 3000

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[180px] flex-1">
                    <TimerBar fraction={leftMs / limit} label={`${seconds}s`} urgent={urgent} />
                </div>
                <HudChip icon="visibility" tone={exposures >= 2 ? 'warn' : 'default'}>
                    <span className="sr-only">Mức bị lộ</span>
                    {Array.from({ length: MAX_EXPOSURES }, (_, index) => (
                        <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < exposures ? 'bg-red-500' : 'bg-slate-300'}`} />
                    ))}
                </HudChip>
            </div>

            <div
                className={`relative aspect-[3/2] w-full select-none overflow-hidden rounded-3xl bg-[#1d140d] shadow-[0_18px_40px_-18px_rgba(15,27,51,0.7)] ring-4 ring-white ${
                    shaking ? 'mg-shake' : ''
                } ${phase === 'play' ? 'cursor-crosshair' : ''}`}
                style={{ touchAction: 'manipulation' }}
                onPointerDown={(event) => void onTap(event)}
                data-testid="soi-nap-stage"
                role="button"
                aria-label="Ảnh lớp lá khô, chạm vào chỗ có nắp hầm"
            >
                {view.imageUrl && <img src={view.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]" />
                {urgent && <div className="pointer-events-none absolute inset-0 animate-pulse bg-red-600/10" />}

                {marks.map((mark) => (
                    <span key={mark.id} className="pointer-events-none absolute" style={{ left: `${mark.x}%`, top: `${mark.y}%` }}>
                        <span className="absolute left-0 top-0 h-14 w-14 rounded-full border-2 border-white/80 motion-safe:animate-[mgRipple_.6s_ease-out_forwards]" />
                        {mark.warmth ? (
                            <span className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center motion-safe:animate-[mgMarkIn_.25s_ease-out_both]">
                                <span className={`h-4 w-4 rounded-full ring-4 ${WARMTH_DOT[mark.warmth]}`} />
                                <span className="mt-1 rounded-full bg-[#0F1B33]/85 px-2 py-0.5 text-[10px] font-black text-white">
                                    {WARMTH_LABEL[mark.warmth]}
                                </span>
                            </span>
                        ) : (
                            <span className="absolute left-0 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                        )}
                    </span>
                ))}

                {phase === 'found' && foundAt && view.revealImageUrl && (
                    <img
                        src={view.revealImageUrl}
                        alt="Nắp hầm được mở ra"
                        className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[mgReveal_1s_ease-out_both]"
                        style={{ '--rx': `${foundAt.x}%`, '--ry': `${foundAt.y}%` } as CSSProperties}
                        draggable={false}
                    />
                )}
                {phase !== 'play' && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
                        <span
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black shadow-lg motion-safe:animate-[mgRise_.3s_ease-out] ${
                                phase === 'found' ? 'bg-[#FDC908] text-[#0F1B33]' : 'bg-red-600 text-white'
                            }`}
                        >
                            <MaterialIcon name={phase === 'found' ? 'task_alt' : 'visibility'} className="text-lg" />
                            {phase === 'found' ? 'Tìm thấy nắp hầm!' : 'Bị lộ!'}
                        </span>
                    </div>
                )}
            </div>
            <p className="text-center text-xs font-semibold text-slate-500">Ảnh chụp thật lớp lá ngụy trang ở địa đạo Củ Chi.</p>
        </div>
    )
}
