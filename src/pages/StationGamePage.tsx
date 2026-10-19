// src/pages/StationGamePage.tsx
// Mini-game của từng trạm (Hành trình 6 trạm): đố nhanh, lật thẻ, sắp thứ tự, tìm điểm khác, nối thuật ngữ, chọn lối thoát.
// Chấm điểm 0–100 ở FE, đăng nhập thì tự lưu kỷ lục lên BE.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { QuestBackdrop } from '../features/gamification/QuestBackdrop'
import { HudChip, Stars } from '../features/minigame/MinigameChrome'
import { buzz, sfx } from '../features/minigame/sfx'
import '../features/minigame/minigame.css'
import { minigameApi, type Minigame } from '../features/minigames/api'
import { locationIdFromSiteCode } from '../shared/config/constants'
import { stationMedia } from '../features/stations/stationMedia'
import { stationDisplayName } from '../features/stations/StationNextSteps'
import { emitEvent } from '../lib/pilotEvents'
import { useAuth } from '../shared/auth/useAuth'

const STATIONS = ['ST01', 'ST02', 'ST03', 'ST04', 'ST05', 'ST06']

function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

/** Xáo nhưng không trùng thứ tự đúng (để không bấm Kiểm tra là thắng). */
function shuffledIndexes(length: number): number[] {
    const base = Array.from({ length }, (_, i) => i)
    if (length < 2) return base
    let next = shuffle(base)
    for (let guard = 0; guard < 10 && next.every((value, index) => value === index); guard++) next = shuffle(base)
    return next
}

function starsFor(score: number) {
    if (score >= 90) return 3
    if (score >= 70) return 2
    if (score >= 40) return 1
    return 0
}

type GameProps = { config: Record<string, unknown>; onDone: (score: number) => void }

const CARD = 'rounded-2xl border-2 bg-white px-4 py-3 text-left text-sm font-bold text-[#0F1B33] transition'

function QuizTimedGame({ config, onDone }: GameProps) {
    const questions = (config.questions as { prompt: string; options: string[]; correctIndex: number }[]) ?? []
    const timeLimitSec = (config.timeLimitSec as number) ?? 90
    const [idx, setIdx] = useState(0)
    const [correct, setCorrect] = useState(0)
    const [picked, setPicked] = useState<number | null>(null)
    const [finished, setFinished] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(timeLimitSec)

    useEffect(() => {
        if (finished) return
        const t = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
        return () => window.clearInterval(t)
    }, [finished])

    useEffect(() => {
        if (secondsLeft === 0 && !finished) setFinished(true)
    }, [secondsLeft, finished])

    useEffect(() => {
        if (finished && questions.length > 0) onDone(Math.round((correct / questions.length) * 100))
    }, [finished])

    const q = questions[idx]
    if (!q) return <p className="text-slate-500">Không có câu hỏi.</p>

    const pick = (optionIndex: number) => {
        if (finished || picked !== null) return
        setPicked(optionIndex)
        const ok = optionIndex === q.correctIndex
        if (ok) {
            setCorrect((c) => c + 1)
            sfx.good()
        } else {
            sfx.bad()
            buzz(60)
        }
        window.setTimeout(() => {
            setPicked(null)
            if (idx + 1 >= questions.length) setFinished(true)
            else setIdx((i) => i + 1)
        }, 900)
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <HudChip icon="quiz">
                    Câu {idx + 1}/{questions.length}
                </HudChip>
                <HudChip icon="timer" tone={secondsLeft <= 10 ? 'warn' : 'default'}>
                    {secondsLeft}s
                </HudChip>
                <HudChip icon="check_circle" tone="good">
                    Đúng {correct}
                </HudChip>
            </div>
            <p className="rounded-2xl bg-white p-5 text-lg font-black leading-snug text-[#0F1B33] ring-1 ring-[#0275FB]/10">{q.prompt}</p>
            <div className="grid gap-3 sm:grid-cols-2">
                {q.options.map((opt, i) => {
                    const reveal = picked !== null
                    const tone = !reveal
                        ? 'border-[#0275FB]/15 hover:border-[#0275FB]'
                        : i === q.correctIndex
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : i === picked
                            ? 'mg-shake border-red-400 bg-red-50 text-red-700'
                            : 'border-slate-200 opacity-60'
                    return (
                        <button key={opt} type="button" onClick={() => pick(i)} disabled={finished} className={`${CARD} min-h-[56px] ${tone}`}>
                            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#DCEBFF] text-xs font-black text-[#0275FB]">
                                {String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function MemoryPairsGame({ config, onDone }: GameProps) {
    const pairs = useMemo(() => (config.pairs as { id: string; label: string }[]) ?? [], [config])
    const cards = useMemo(() => shuffle(pairs.flatMap((p) => [p, p]).map((p, i) => ({ ...p, key: `${p.id}-${i}` }))), [pairs])
    const [flipped, setFlipped] = useState<number[]>([])
    const [matched, setMatched] = useState<Set<string>>(new Set())
    const [lock, setLock] = useState(false)
    const [moves, setMoves] = useState(0)

    useEffect(() => {
        if (pairs.length > 0 && matched.size === pairs.length) {
            const extra = Math.max(0, moves - pairs.length)
            onDone(Math.max(40, 100 - extra * 6))
        }
    }, [matched.size])

    const click = (index: number) => {
        if (lock || matched.has(cards[index].id) || flipped.includes(index)) return
        sfx.tap()
        const next = [...flipped, index]
        setFlipped(next)
        if (next.length < 2) return
        setMoves((m) => m + 1)
        const [a, b] = next
        if (cards[a].id === cards[b].id) {
            sfx.good()
            setMatched((m) => new Set(m).add(cards[a].id))
            setFlipped([])
        } else {
            setLock(true)
            window.setTimeout(() => {
                setFlipped([])
                setLock(false)
            }, 750)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <HudChip icon="style">
                    Cặp {matched.size}/{pairs.length}
                </HudChip>
                <HudChip icon="touch_app">{moves} lượt lật</HudChip>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {cards.map((c, i) => {
                    const show = flipped.includes(i) || matched.has(c.id)
                    const done = matched.has(c.id)
                    return (
                        <button
                            key={c.key}
                            type="button"
                            onClick={() => click(i)}
                            aria-label={show ? c.label : 'Thẻ úp'}
                            className={`flex min-h-[84px] items-center justify-center rounded-2xl p-2 text-center text-xs font-black transition-all duration-200 ${
                                done
                                    ? 'bg-emerald-500 text-white'
                                    : show
                                      ? 'bg-white text-[#0F1B33] ring-2 ring-[#0275FB]'
                                      : 'bg-gradient-to-br from-[#0275FB] to-[#3B93FF] text-transparent shadow-[0_4px_0_#0159C2] hover:-translate-y-0.5'
                            }`}
                        >
                            {show ? c.label : <MaterialIcon name="help" className="text-2xl text-white/70" />}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function TimelineOrderGame({ config, onDone }: GameProps) {
    const items = (config.items as string[]) ?? []
    const [order, setOrder] = useState<number[]>(() => shuffledIndexes(items.length))
    const [checked, setChecked] = useState(false)

    const move = (from: number, dir: -1 | 1) => {
        if (checked) return
        const to = from + dir
        if (to < 0 || to >= order.length) return
        sfx.rotate()
        const next = [...order]
        ;[next[from], next[to]] = [next[to], next[from]]
        setOrder(next)
    }

    const check = () => {
        setChecked(true)
        const ok = order.filter((v, i) => v === i).length
        if (ok === items.length) sfx.win()
        else sfx.bad()
        onDone(Math.round((ok / Math.max(items.length, 1)) * 100))
    }

    return (
        <div className="space-y-4">
            {config.hint ? (
                <p className="rounded-2xl bg-[#FFF2C3] px-4 py-3 text-sm font-bold text-[#5C4500]">{String(config.hint)}</p>
            ) : null}
            <ol className="space-y-2">
                {order.map((itemIdx, pos) => {
                    const right = checked && itemIdx === pos
                    const wrong = checked && itemIdx !== pos
                    return (
                        <li
                            key={itemIdx}
                            className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-3 ${
                                right ? 'border-emerald-400' : wrong ? 'border-red-300' : 'border-[#0275FB]/15'
                            }`}
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0275FB] text-sm font-black text-white">{pos + 1}</span>
                            <span className="flex-1 text-sm font-bold text-[#0F1B33]">{items[itemIdx]}</span>
                            {checked ? (
                                <MaterialIcon name={right ? 'check_circle' : 'cancel'} className={right ? 'text-emerald-500' : 'text-red-400'} />
                            ) : (
                                <span className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => move(pos, -1)}
                                        aria-label="Lên"
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCEBFF] text-[#0275FB] disabled:opacity-30"
                                        disabled={pos === 0}
                                    >
                                        <MaterialIcon name="arrow_upward" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => move(pos, 1)}
                                        aria-label="Xuống"
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCEBFF] text-[#0275FB] disabled:opacity-30"
                                        disabled={pos === order.length - 1}
                                    >
                                        <MaterialIcon name="arrow_downward" />
                                    </button>
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>
            {!checked && <CheckButton onClick={check} label="Kiểm tra thứ tự" />}
        </div>
    )
}

function SpotDiffGame({ config, onDone }: GameProps) {
    const leftItems = (config.leftItems as string[]) ?? []
    const rightItems = (config.rightItems as string[]) ?? []
    const diffIndices = (config.diffIndices as number[]) ?? []
    const [picked, setPicked] = useState<Set<number>>(new Set())
    const [checked, setChecked] = useState(false)

    const toggle = (i: number) => {
        if (checked) return
        sfx.tap()
        setPicked((prev) => {
            const n = new Set(prev)
            if (n.has(i)) n.delete(i)
            else n.add(i)
            return n
        })
    }

    const check = () => {
        setChecked(true)
        const target = new Set(diffIndices)
        const hits = [...picked].filter((i) => target.has(i)).length
        const falsePos = picked.size - hits
        const missed = diffIndices.length - hits
        const score = Math.max(0, Math.round(((hits - falsePos - missed) / Math.max(diffIndices.length, 1)) * 100))
        if (score >= 100) sfx.win()
        else sfx.bad()
        onDone(Math.min(100, score))
    }

    return (
        <div className="space-y-4">
            <p className="text-sm font-bold text-slate-600">Chạm vào những dòng mà hai cột khác nhau.</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-black uppercase tracking-widest text-[#0275FB]">
                <span>{String(config.leftTitle ?? 'A')}</span>
                <span>{String(config.rightTitle ?? 'B')}</span>
            </div>
            <div className="space-y-2">
                {leftItems.map((line, i) => {
                    const isDiff = diffIndices.includes(i)
                    const on = picked.has(i)
                    const tone = checked
                        ? isDiff
                            ? 'border-emerald-500 bg-emerald-50'
                            : on
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-200'
                        : on
                          ? 'border-[#FDC908] bg-[#FFF2C3]'
                          : 'border-[#0275FB]/15'
                    return (
                        <button key={line + i} type="button" onClick={() => toggle(i)} className={`grid w-full grid-cols-2 gap-2 rounded-2xl border-2 bg-white p-3 text-left text-sm font-bold ${tone}`}>
                            <span className="text-[#0F1B33]">{line}</span>
                            <span className="text-[#0F1B33]">{rightItems[i] ?? ''}</span>
                        </button>
                    )
                })}
            </div>
            {!checked && <CheckButton onClick={check} label="Xác nhận" />}
        </div>
    )
}

const PAIR_COLORS = ['bg-[#0275FB] text-white', 'bg-[#FDC908] text-[#0F1B33]', 'bg-emerald-500 text-white', 'bg-purple-500 text-white', 'bg-orange-500 text-white', 'bg-pink-500 text-white']

function MatchTermsGame({ config, onDone }: GameProps) {
    const terms = (config.terms as string[]) ?? []
    const definitions = (config.definitions as string[]) ?? []
    const answerKey = (config.answerKey as number[]) ?? terms.map((_, i) => i)
    const [defOrder] = useState<number[]>(() => shuffledIndexes(definitions.length))
    const [map, setMap] = useState<Record<number, number>>({})
    const [selected, setSelected] = useState<number | null>(null)
    const [checked, setChecked] = useState(false)

    const pickDef = (defIndex: number) => {
        if (checked || selected === null) return
        sfx.rotate()
        setMap((current) => {
            const next: Record<number, number> = {}
            Object.entries(current).forEach(([term, def]) => {
                if (def !== defIndex && Number(term) !== selected) next[Number(term)] = def
            })
            next[selected] = defIndex
            return next
        })
        setSelected(null)
    }

    const check = () => {
        setChecked(true)
        const ok = terms.filter((_, i) => map[i] === answerKey[i]).length
        if (ok === terms.length) sfx.win()
        else sfx.bad()
        onDone(Math.round((ok / Math.max(terms.length, 1)) * 100))
    }

    const termOfDef = (defIndex: number) => Object.entries(map).find(([, def]) => def === defIndex)?.[0]
    const allMatched = terms.length > 0 && terms.every((_, i) => map[i] !== undefined)

    return (
        <div className="space-y-4">
            <p className="text-sm font-bold text-slate-600">Chọn một thuật ngữ, rồi chạm vào lời giải thích phù hợp.</p>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    {terms.map((term, i) => {
                        const assigned = map[i] !== undefined
                        const ok = checked && map[i] === answerKey[i]
                        return (
                            <button
                                key={term}
                                type="button"
                                onClick={() => !checked && setSelected(i)}
                                className={`${CARD} flex w-full items-center gap-2 ${
                                    checked ? (ok ? 'border-emerald-500 bg-emerald-50' : 'border-red-400 bg-red-50') : selected === i ? 'border-[#FDC908] bg-[#FFF2C3]' : 'border-[#0275FB]/15'
                                }`}
                            >
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${assigned ? PAIR_COLORS[i % PAIR_COLORS.length] : 'bg-slate-100 text-slate-400'}`}>
                                    {i + 1}
                                </span>
                                {term}
                            </button>
                        )
                    })}
                </div>
                <div className="space-y-2">
                    {defOrder.map((defIndex) => {
                        const term = termOfDef(defIndex)
                        return (
                            <button
                                key={definitions[defIndex]}
                                type="button"
                                onClick={() => pickDef(defIndex)}
                                disabled={checked}
                                className={`${CARD} flex w-full items-center gap-2 font-semibold ${selected !== null ? 'border-[#0275FB]/40 hover:border-[#0275FB]' : 'border-slate-200'}`}
                            >
                                <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                        term !== undefined ? PAIR_COLORS[Number(term) % PAIR_COLORS.length] : 'bg-slate-100 text-slate-400'
                                    }`}
                                >
                                    {term !== undefined ? Number(term) + 1 : '?'}
                                </span>
                                {definitions[defIndex]}
                            </button>
                        )
                    })}
                </div>
            </div>
            {!checked && <CheckButton onClick={check} label={allMatched ? 'Kiểm tra' : 'Nối hết rồi kiểm tra'} disabled={!allMatched} />}
        </div>
    )
}

function CompassChoiceGame({ config, onDone }: GameProps) {
    const choices = (config.choices as { id: string; label: string; correct: boolean }[]) ?? []
    const [picked, setPicked] = useState<string | null>(null)
    const icons: Record<string, string> = { n: 'north', e: 'east', s: 'south', w: 'west' }

    const pick = (id: string, correct: boolean) => {
        if (picked) return
        setPicked(id)
        if (correct) sfx.win()
        else sfx.bad()
        onDone(correct ? 100 : 25)
    }

    return (
        <div className="space-y-4">
            <p className="rounded-2xl bg-[#0F1B33] p-5 text-base font-bold leading-relaxed text-white">{String(config.scenario ?? '')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
                {choices.map((c) => {
                    const reveal = picked !== null
                    const tone = !reveal
                        ? 'border-[#0275FB]/15 hover:border-[#0275FB]'
                        : c.correct
                          ? 'border-emerald-500 bg-emerald-50'
                          : picked === c.id
                            ? 'border-red-400 bg-red-50'
                            : 'border-slate-200 opacity-60'
                    return (
                        <button key={c.id} type="button" disabled={reveal} onClick={() => pick(c.id, c.correct)} className={`${CARD} flex min-h-[64px] items-center gap-3 ${tone}`}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCEBFF] text-[#0275FB]">
                                <MaterialIcon name={icons[c.id] ?? 'explore'} />
                            </span>
                            {c.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function CheckButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0275FB] text-base font-black text-white shadow-[0_5px_0_#0159C2] transition active:translate-y-[3px] disabled:bg-slate-300 disabled:shadow-none"
        >
            <MaterialIcon name="fact_check" className="text-xl" /> {label}
        </button>
    )
}

/** Game còn khoá: chỉ nhử bằng ảnh trạm mờ + loại game, không lộ nội dung (BE cũng không gửi config). */
function LockedCard({
    stationCode,
    siteCode,
    locationId,
    type,
    heroImage,
}: {
    stationCode: string
    siteCode: string
    locationId: string
    type?: { label: string; icon: string }
    heroImage?: string
}) {
    return (
        <section
            data-testid="station-game-locked"
            className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-24px_rgba(2,117,251,0.45)] ring-1 ring-[#0275FB]/10"
        >
            <div className="relative h-52 overflow-hidden bg-[#0F1B33] sm:h-64">
                {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-[6px]" />}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B33] via-[#0F1B33]/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FDC908] text-[#0F1B33] shadow-[0_8px_0_#C99A00]">
                        <MaterialIcon name="lock" className="text-3xl" />
                    </span>
                    <p className="px-6 text-lg font-black leading-snug text-white sm:text-xl">Chưa mở khoá</p>
                    {type && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white">
                            <MaterialIcon name={type.icon} className="text-sm" /> {type.label}
                        </span>
                    )}
                </div>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
                <p className="rounded-2xl bg-[#FFF2C3] px-4 py-3 text-sm font-bold leading-relaxed text-[#5C4500]">
                    <MaterialIcon name="qr_code_scanner" className="mr-1 align-[-3px] text-base" />
                    Mini-game này mở khi bạn đứng tại trạm {stationCode} và quét mã QR. Mỗi trạm một trò khác nhau.
                </p>
                <ul className="space-y-2 text-sm text-[#0F1B33]">
                    <li className="flex gap-2">
                        <MaterialIcon name="stars" className="text-base text-[#F5A800]" /> Tối đa 100 điểm trạm, có lưu kỷ lục
                    </li>
                    <li className="flex gap-2">
                        <MaterialIcon name="auto_stories" className="text-base text-[#0275FB]" /> Check-in cũng mở chương truyện của trạm
                    </li>
                </ul>
                <Link
                    to={`/scan?locationId=${encodeURIComponent(locationId)}&site=${encodeURIComponent(siteCode)}`}
                    data-testid="station-game-scan-cta"
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0275FB] text-base font-black text-white shadow-[0_6px_0_#0159C2] transition active:translate-y-[3px]"
                >
                    <MaterialIcon name="qr_code_scanner" className="text-2xl" /> Quét QR tại trạm {stationCode}
                </Link>
                <Link
                    to={`/sites/${siteCode}/stations/${stationCode}/media`}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#0275FB]/20 bg-white text-sm font-black text-[#0275FB]"
                >
                    <MaterialIcon name="photo_library" className="text-lg" /> Xem trước trạm {stationCode}
                </Link>
            </div>
        </section>
    )
}

const TYPE_LABEL: Record<string, { label: string; icon: string }> = {
    QUIZ_TIMED: { label: 'Đố nhanh', icon: 'quiz' },
    MEMORY_PAIRS: { label: 'Lật thẻ ghép cặp', icon: 'style' },
    TIMELINE_ORDER: { label: 'Sắp xếp thứ tự', icon: 'format_list_numbered' },
    SPOT_DIFF: { label: 'Tìm điểm khác', icon: 'difference' },
    MATCH_TERMS: { label: 'Nối thuật ngữ', icon: 'join_inner' },
    COMPASS_CHOICE: { label: 'Chọn lối đi', icon: 'explore' },
}

export function StationGamePage() {
    const { siteCode: siteCodeParam, code: stationCode = 'ST01', gameId = '' } = useParams<{ siteCode?: string; code: string; gameId: string }>()
    const siteCode = (siteCodeParam || 'cu-chi').trim().toLowerCase()
    const { isAuthenticated } = useAuth()
    const [game, setGame] = useState<Minigame | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [finalScore, setFinalScore] = useState<number | null>(null)
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
    const [newBest, setNewBest] = useState(false)
    const [round, setRound] = useState(0)

    useEffect(() => {
        let cancelled = false
        setLoadError(null)
        setGame(null)
        setFinalScore(null)
        setSaveState('idle')
        minigameApi
            .listForStation(siteCode, stationCode)
            .then((list) => {
                if (cancelled) return
                const found = list.find((g) => g.id === gameId) ?? list[0] ?? null
                setGame(found)
                if (!found) setLoadError('Trạm này chưa có mini-game.')
            })
            .catch(() => {
                if (!cancelled) setLoadError('Không tải được mini-game. Kiểm tra kết nối rồi thử lại.')
            })
        return () => {
            cancelled = true
        }
    }, [siteCode, stationCode, gameId])

    const onDone = useCallback(
        (score: number) => {
            window.setTimeout(() => setFinalScore(score), 700)
            if (!game || !isAuthenticated) return
            setSaveState('saving')
            minigameApi
                .submit(game.id, score)
                .then((saved) => {
                    setSaveState('saved')
                    setNewBest(saved.newBest)
                    emitEvent('game_completed', { stationCode, payload: { minigameId: game.id, score, gameType: game.gameType } })
                })
                .catch(() => setSaveState('failed'))
        },
        [game, isAuthenticated, stationCode],
    )

    const replay = () => {
        setFinalScore(null)
        setSaveState('idle')
        setNewBest(false)
        setRound((value) => value + 1)
    }

    const renderer = useMemo(() => {
        if (!game || !game.unlocked) return null
        const props = { config: game.config, onDone }
        switch (game.gameType) {
            case 'QUIZ_TIMED':
                return <QuizTimedGame key={round} {...props} />
            case 'MEMORY_PAIRS':
                return <MemoryPairsGame key={round} {...props} />
            case 'TIMELINE_ORDER':
                return <TimelineOrderGame key={round} {...props} />
            case 'SPOT_DIFF':
                return <SpotDiffGame key={round} {...props} />
            case 'MATCH_TERMS':
                return <MatchTermsGame key={round} {...props} />
            case 'COMPASS_CHOICE':
                return <CompassChoiceGame key={round} {...props} />
            default:
                return <p className="text-slate-500">Loại game chưa hỗ trợ: {game.gameType}</p>
        }
    }, [game, onDone, round])

    const stationHref = `/sites/${siteCode}/stations/${stationCode}/media`
    const nextStation = STATIONS[STATIONS.indexOf(stationCode) + 1]
    const media = stationMedia(siteCode, stationCode)
    const type = game ? TYPE_LABEL[game.gameType] : null
    const stars = finalScore === null ? 0 : starsFor(finalScore)

    return (
        <AppLayout
            activeBorder="left"
            topNav={<SimpleTopNav title={`Mini-game trạm ${stationCode}`} backTo={stationHref} backLabel="Về trạm" />}
            mobileBackTo={stationHref}
            mobileTitle={`Mini-game ${stationCode}`}
            className="min-h-screen !bg-[#DCEBFF] text-[#0F1B33]"
        >
            <QuestBackdrop />
            <div className="relative z-10 pt-14 md:pt-16">
                <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-24 pt-4 md:px-6 md:pt-8" data-testid="station-game-page">
                    <header className="relative overflow-hidden rounded-3xl bg-[#0F1B33] p-5 text-white">
                        {media && <img src={media.hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
                        <div className="relative">
                            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#FDC908] px-3 py-1 text-[11px] font-black text-[#0F1B33]">
                                <MaterialIcon name={type?.icon ?? 'sports_esports'} className="text-sm" />
                                Trạm {stationCode} · {stationDisplayName(stationCode, siteCode)}
                                {type ? ` · ${type.label}` : ''}
                            </p>
                            <h1 className="mt-3 text-2xl font-black leading-tight md:text-3xl">{game?.title ?? 'Đang tải…'}</h1>
                            {game?.bestScore != null && <p className="mt-1 text-sm font-bold text-white/80">Kỷ lục của bạn: {game.bestScore} điểm</p>}
                        </div>
                    </header>

                    {loadError && (
                        <section className="rounded-3xl bg-white p-6 text-center ring-1 ring-[#0275FB]/10">
                            <p className="font-black">{loadError}</p>
                            <Link to={stationHref} className="mt-4 inline-flex min-h-[44px] items-center rounded-2xl bg-[#0275FB] px-5 text-sm font-black text-white">
                                Về trạm
                            </Link>
                        </section>
                    )}

                    {!game && !loadError && <div className="h-72 animate-pulse rounded-3xl bg-white/70" />}

                    {game && !game.unlocked && (
                        <LockedCard
                            stationCode={stationCode}
                            siteCode={siteCode}
                            locationId={locationIdFromSiteCode(siteCode)}
                            type={type ?? undefined}
                            heroImage={media?.hero}
                        />
                    )}

                    {game && game.unlocked && finalScore === null && (
                        <section className="rounded-3xl bg-white/60 p-4 ring-1 ring-[#0275FB]/10 sm:p-5">{renderer}</section>
                    )}

                    {finalScore !== null && (
                        <section className="rounded-3xl bg-white p-6 text-center shadow-[0_20px_50px_-24px_rgba(2,117,251,0.45)] ring-1 ring-[#0275FB]/10 motion-safe:animate-[mgRise_.35s_ease-out]" data-testid="station-game-result">
                            <p className="text-sm font-black uppercase tracking-widest text-[#0275FB]">Điểm trạm</p>
                            <p className="mt-1 text-5xl font-black text-[#0F1B33]">{finalScore}</p>
                            <div className="mt-3">
                                <Stars value={stars} animate />
                            </div>
                            <p className="mt-3 text-sm font-bold text-slate-600">
                                {saveState === 'saving' && 'Đang lưu điểm…'}
                                {saveState === 'saved' && (newBest ? 'Kỷ lục mới! Đã lưu điểm.' : 'Đã lưu điểm.')}
                                {saveState === 'failed' && 'Chưa lưu được điểm. Kiểm tra kết nối.'}
                                {!isAuthenticated && (
                                    <>
                                        <Link to="/login" className="font-black text-[#0275FB] underline">
                                            Đăng nhập
                                        </Link>{' '}
                                        để lưu kỷ lục.
                                    </>
                                )}
                            </p>
                            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                                <button
                                    type="button"
                                    onClick={replay}
                                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-[#0275FB]/25 bg-white px-5 text-sm font-black text-[#0275FB]"
                                >
                                    <MaterialIcon name="replay" className="text-lg" /> Chơi lại
                                </button>
                                {nextStation && (
                                    <Link
                                        to={`/sites/${siteCode}/stations/${nextStation}/media`}
                                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#0275FB] px-5 text-sm font-black text-white shadow-[0_5px_0_#0159C2]"
                                    >
                                        Trạm tiếp theo · {nextStation} <MaterialIcon name="arrow_forward" className="text-lg" />
                                    </Link>
                                )}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </AppLayout>
    )
}
