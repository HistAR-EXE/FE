// src/features/minigame/engines/ImLangGame.tsx
// Im lặng: lính tuần tra đi ngang trên nắp hầm. Giữ im trước micro (3 sao) hoặc giữ nút (2 sao)
// cho tới khi họ đi qua. Mic: đo tiếng nền 1,5 giây rồi tính thời gian im lặng.

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import type { MinigameAttemptResult } from '../api'
import type { EngineProps } from '../engineTypes'
import { HudChip } from '../MinigameChrome'
import { buzz, sfx } from '../sfx'

type Mode = 'init' | 'mic' | 'hold'

function Boot({ flip = false }: { flip?: boolean }) {
    return (
        <svg viewBox="0 0 40 30" className={`h-7 w-9 ${flip ? '-scale-x-100' : ''}`} aria-hidden>
            <path d="M8 2h12v14l14 4q4 1 4 6v2H6V2z" fill="#2b2b2b" />
            <rect x="6" y="24" width="32" height="5" rx="2" fill="#151515" />
        </svg>
    )
}

export function ImLangGame({ view, submit, onResolved, say }: EngineProps) {
    const need = view.holdMs ?? 3000
    const margin = view.marginRatio ?? 1.8
    const [mode, setMode] = useState<Mode>('init')
    const [progress, setProgress] = useState(0)
    const [level, setLevel] = useState(0)
    const [calibrating, setCalibrating] = useState(false)
    const [alert, setAlert] = useState(false)
    const [holding, setHolding] = useState(false)
    const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null)
    const [sent, setSent] = useState(false)
    const sentRef = useRef(false)
    const micActiveRef = useRef(true)
    const stopMicRef = useRef<() => void>(() => undefined)
    const holdStartRef = useRef(0)
    const holdRafRef = useRef(0)
    const lastStepRef = useRef(0)
    const alertTimerRef = useRef(0)

    const finish = async (body: { quietMs: number; baselineRms: number; peakRms: number; holdMs: number }) => {
        if (sentRef.current) return
        sentRef.current = true
        setSent(true)
        const result = await submit(body)
        if (result.kind !== 'done') {
            sentRef.current = false
            setSent(false)
            return
        }
        const graded: MinigameAttemptResult = result.result
        if (graded.stars >= 2) {
            setOutcome('win')
            setProgress(1)
            sfx.win()
            buzz([30, 40, 60])
            say({ text: 'Tiếng bước chân xa dần rồi. Mình an toàn!' })
        } else {
            setOutcome('lose')
            sfx.lose()
            buzz(200)
            say({ text: graded.stars === 1 ? 'Suýt nữa thì lộ! Lần sau giữ im lâu hơn nhé.' : 'Lính nghe thấy động rồi! Thử lại nhé.', mood: 'surprised' })
        }
        window.setTimeout(() => onResolved(graded), 1500)
    }

    const finishRef = useRef(finish)
    useEffect(() => {
        finishRef.current = finish
    })

    // Chọn chế độ: thử micro trước, không được thì giữ nút.
    useEffect(() => {
        let cancelled = false
        const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
        if (!getUserMedia) {
            setMode('hold')
            say({ text: 'Máy không có micro. Giữ nút bên dưới cho tới khi lính đi qua nhé.' })
            return
        }
        say({ text: 'Suỵt… Chị đang nghe tiếng nền. Đừng nói gì nhé.' })
        let stream: MediaStream | null = null
        let audio: AudioContext | null = null
        let raf = 0
        getUserMedia({ audio: true })
            .then((media) => {
                if (cancelled || !micActiveRef.current) {
                    media.getTracks().forEach((track) => track.stop())
                    return
                }
                stream = media
                setMode('mic')
                setCalibrating(true)
                audio = new AudioContext()
                const analyser = audio.createAnalyser()
                analyser.fftSize = 1024
                audio.createMediaStreamSource(media).connect(analyser)
                const data = new Uint8Array(analyser.fftSize)
                const started = performance.now()
                const samples: number[] = []
                let baseline = 0
                let peak = 0
                let quiet = 0
                let last = started
                let calibrated = false
                let lastUi = 0
                const tick = () => {
                    if (cancelled || sentRef.current || !micActiveRef.current) return
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
                            setCalibrating(false)
                            say({ text: 'Lính đang tới! Giữ im lặng…' })
                        }
                    } else {
                        const limit = Math.max(0.02, baseline * margin)
                        peak = Math.max(peak, rms)
                        if (rms <= limit) {
                            quiet += now - last
                        } else {
                            window.clearTimeout(alertTimerRef.current)
                            setAlert(true)
                            alertTimerRef.current = window.setTimeout(() => setAlert(false), 900)
                        }
                        last = now
                        if (now - lastUi > 90) {
                            lastUi = now
                            setLevel(Math.min(1, rms / (limit * 2)))
                            setProgress(Math.min(1, quiet / need))
                        }
                        if (quiet >= need) {
                            void finishRef.current({ quietMs: Math.round(quiet), baselineRms: baseline, peakRms: peak, holdMs: 0 })
                            return
                        }
                    }
                    raf = requestAnimationFrame(tick)
                }
                raf = requestAnimationFrame(tick)
            })
            .catch(() => {
                if (cancelled || !micActiveRef.current) return
                setMode('hold')
                say({ text: 'Không mở được micro. Giữ nút bên dưới cho tới khi lính đi qua nhé.' })
            })
        const stop = () => {
            cancelAnimationFrame(raf)
            stream?.getTracks().forEach((track) => track.stop())
            stream = null
            void audio?.close()
            audio = null
        }
        stopMicRef.current = stop
        return () => {
            cancelled = true
            window.clearTimeout(alertTimerRef.current)
            stop()
        }
    }, [say, margin, need])

    const switchToHold = () => {
        if (sentRef.current) return
        micActiveRef.current = false
        stopMicRef.current()
        setCalibrating(false)
        setMode('hold')
        setProgress(0)
        setAlert(false)
        say({ text: 'Được, giữ nút bên dưới. Buông sớm là lính phát hiện đấy.' })
    }

    const onHoldStart = (event: PointerEvent<HTMLButtonElement>) => {
        if (mode !== 'hold' || sentRef.current) return
        event.currentTarget.setPointerCapture(event.pointerId)
        const startedAt = performance.now()
        holdStartRef.current = startedAt
        lastStepRef.current = 0
        setHolding(true)
        say({ text: 'Giữ nguyên… đừng cử động…' })
        const tick = (now: number) => {
            const held = now - startedAt
            setProgress(Math.min(1, held / need))
            if (held - lastStepRef.current > 550) {
                lastStepRef.current = held
                sfx.step()
            }
            if (held >= need) {
                setHolding(false)
                void finishRef.current({ quietMs: 0, baselineRms: 0, peakRms: 1, holdMs: Math.round(held) })
                return
            }
            holdRafRef.current = requestAnimationFrame(tick)
        }
        holdRafRef.current = requestAnimationFrame(tick)
    }

    const onHoldEnd = () => {
        if (!holding || sentRef.current) return
        cancelAnimationFrame(holdRafRef.current)
        setHolding(false)
        const held = Math.round(performance.now() - holdStartRef.current)
        if (held >= need) return
        setAlert(true)
        void finishRef.current({ quietMs: 0, baselineRms: 0, peakRms: 1, holdMs: held })
    }

    useEffect(() => () => cancelAnimationFrame(holdRafRef.current), [])

    const walking = !alert && outcome === null && ((mode === 'mic' && !calibrating) || (mode === 'hold' && holding))
    const left = `${Math.round(progress * 100)}%`

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <HudChip icon={mode === 'mic' ? 'mic' : 'touch_app'}>{mode === 'mic' ? 'Đang nghe qua micro' : mode === 'hold' ? 'Giữ nút' : 'Đang mở micro…'}</HudChip>
                <HudChip icon="directions_walk" tone={progress >= 1 ? 'good' : 'default'}>
                    Lính đi qua {Math.round(progress * 100)}%
                </HudChip>
                {alert && outcome === null && (
                    <HudChip icon="hearing" tone="warn">
                        Có tiếng động!
                    </HudChip>
                )}
            </div>

            <div
                className={`relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-[#3b2615] shadow-[0_18px_40px_-18px_rgba(15,27,51,0.7)] ring-4 ring-white ${alert ? 'mg-shake' : ''}`}
                data-testid="im-lang-stage"
            >
                <svg viewBox="0 0 160 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                    <defs>
                        <linearGradient id="il-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#8fc3ee" />
                            <stop offset="1" stopColor="#e4f2fc" />
                        </linearGradient>
                        <linearGradient id="il-soil" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#80593a" />
                            <stop offset="1" stopColor="#2e1d10" />
                        </linearGradient>
                        <radialGradient id="il-lamp" cx="50%" cy="60%" r="55%">
                            <stop offset="0" stopColor="#ffb54a" stopOpacity="0.55" />
                            <stop offset="1" stopColor="#ffb54a" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <rect width="160" height="36" fill="url(#il-sky)" />
                    {/* Rừng phía xa */}
                    <path d="M0 30 Q10 20 20 28 Q28 18 38 27 Q48 21 56 29 L56 36 L0 36 Z" fill="#6aa35c" opacity="0.7" />
                    <path d="M104 29 Q114 18 124 27 Q134 20 144 28 Q152 22 160 27 L160 36 L104 36 Z" fill="#6aa35c" opacity="0.7" />
                    <g fill="#3f7d3a">
                        <circle cx="12" cy="31" r="5" />
                        <circle cx="18" cy="29" r="6" />
                        <circle cx="25" cy="32" r="4.5" />
                        <circle cx="132" cy="30" r="6" />
                        <circle cx="139" cy="32" r="4.5" />
                        <circle cx="146" cy="30" r="5" />
                    </g>
                    <rect y="34" width="160" height="66" fill="url(#il-soil)" />
                    <rect y="33" width="160" height="3.5" fill="#5c8a3c" />
                    {/* Nắp hầm và lối xuống */}
                    <rect x="74" y="33.2" width="12" height="2.6" rx="0.6" fill="#6b4a2d" stroke="#4f7f33" strokeWidth="0.6" />
                    <rect x="78.5" y="36" width="3" height="14" fill="#1d120a" />
                    {/* Căn hầm có ánh đèn dầu */}
                    <ellipse cx="80" cy="72" rx="34" ry="19" fill="#140b05" />
                    <ellipse cx="80" cy="72" rx="34" ry="19" fill="url(#il-lamp)" />
                    <circle cx="101" cy="68" r="1.4" fill="#ffd27a" />
                    {/* Lớp đất */}
                    <path d="M0 50 Q40 47 80 51 T160 49" stroke="#000" strokeOpacity="0.12" strokeWidth="0.6" fill="none" />
                    <path d="M0 88 Q40 85 80 89 T160 87" stroke="#000" strokeOpacity="0.15" strokeWidth="0.6" fill="none" />
                </svg>
                {/* Toán lính */}
                <div className="absolute top-[22%] flex items-end gap-1 transition-[left] duration-100 ease-linear" style={{ left: `calc(${left} * 0.9 - 6%)` }}>
                    <span className={walking ? 'motion-safe:animate-[mgStomp_.5s_ease-in-out_infinite]' : ''}>
                        <Boot />
                    </span>
                    <span className={walking ? 'motion-safe:animate-[mgStomp_.5s_ease-in-out_.25s_infinite]' : ''}>
                        <Boot />
                    </span>
                    {alert && outcome === null && (
                        <span className="absolute -top-7 left-4 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">?!</span>
                    )}
                </div>

                <img
                    src="/images/characters/chi-nam.png"
                    alt=""
                    className={`absolute bottom-[11%] left-[44%] h-[36%] object-contain ${holding || (mode === 'mic' && !calibrating) ? 'motion-safe:animate-[mgBob_1.6s_ease-in-out_infinite]' : ''}`}
                    draggable={false}
                />
                <img src="/images/characters/anh-ba.png" alt="" className="absolute bottom-[11%] left-[33%] h-[38%] object-contain" draggable={false} />

                {/* Đồng hồ tiếng ồn (micro) */}
                {mode === 'mic' && (
                    <div className="absolute bottom-[8%] right-[4%] top-[46%] w-4 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/30">
                        <div
                            className={`absolute inset-x-0 bottom-0 transition-[height] duration-100 ${level > 0.5 ? 'bg-red-500' : 'bg-emerald-400'}`}
                            style={{ height: `${Math.round(level * 100)}%` }}
                        />
                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white" />
                    </div>
                )}
                {calibrating && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center">
                        <span className="rounded-full bg-[#0F1B33]/80 px-3 py-1 text-xs font-black text-white">Đang nghe tiếng nền…</span>
                    </div>
                )}
                {outcome && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center">
                        <span
                            className={`rounded-full px-4 py-2 text-sm font-black shadow-lg ${outcome === 'win' ? 'bg-[#FDC908] text-[#0F1B33]' : 'bg-red-600 text-white'}`}
                        >
                            {outcome === 'win' ? 'An toàn!' : 'Bị phát hiện!'}
                        </span>
                    </div>
                )}
            </div>

            {mode === 'hold' ? (
                <button
                    type="button"
                    onPointerDown={onHoldStart}
                    onPointerUp={onHoldEnd}
                    onPointerCancel={onHoldEnd}
                    onContextMenu={(event) => event.preventDefault()}
                    disabled={sent || outcome !== null}
                    data-testid="im-lang-hold"
                    className={`flex min-h-[64px] w-full select-none items-center justify-center gap-2 rounded-2xl text-base font-black transition ${
                        holding ? 'scale-[0.98] bg-[#0F1B33] text-white' : 'bg-[#0275FB] text-white shadow-[0_6px_0_#0159C2]'
                    } disabled:bg-slate-300 disabled:shadow-none`}
                    style={{ touchAction: 'none' }}
                >
                    <MaterialIcon name="front_hand" className="text-2xl" />
                    {holding ? 'Đang nín thở… đừng buông' : 'Nhấn giữ để nín thở'}
                </button>
            ) : (
                outcome === null && (
                    <button
                        type="button"
                        onClick={switchToHold}
                        className="w-full text-center text-xs font-bold text-[#0275FB] underline-offset-2 hover:underline"
                    >
                        Chỗ bạn ồn quá? Chuyển sang giữ nút (tối đa 2 sao)
                    </button>
                )
            )}
        </div>
    )
}
