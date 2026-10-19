// src/features/minigame/MinigameChrome.tsx
// Khung dùng chung của mini game: nhân vật dẫn, màn giới thiệu, thanh thời gian, màn kết quả.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { MinigameAttemptResult } from './api'
import { CHARACTER_NAME, characterFace, type Character, type EngineMeta, type GuideLine } from './engineTypes'

export function GuideBubble({ character, line }: { character: Character; line: GuideLine | null }) {
    if (!line) return null
    return (
        <div className="flex items-end gap-3" aria-live="polite">
            <img
                src={characterFace(character, line.mood)}
                alt={CHARACTER_NAME[character]}
                className="h-16 w-12 shrink-0 object-contain object-bottom drop-shadow-md sm:h-20 sm:w-16"
                draggable={false}
            />
            <div className="relative min-w-0 flex-1 rounded-2xl rounded-bl-sm border border-[#0275FB]/15 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#0275FB]">{CHARACTER_NAME[character]}</p>
                <p key={line.text} className="mt-0.5 text-sm font-semibold leading-snug text-[#0F1B33] motion-safe:animate-[mgFadeIn_.25s_ease-out]">
                    {line.text}
                </p>
            </div>
        </div>
    )
}

export function Stars({ value, size = 'text-4xl', animate = false }: { value: number; size?: string; animate?: boolean }) {
    return (
        <div className="flex items-center justify-center gap-1" role="img" aria-label={`${value} trên 3 sao`}>
            {[1, 2, 3].map((n) => (
                <MaterialIcon
                    key={n}
                    name="star"
                    filled={n <= value}
                    className={`${size} ${n <= value ? 'text-[#FDC908] drop-shadow-[0_2px_0_#C99A00]' : 'text-slate-300'} ${
                        animate && n <= value ? 'motion-safe:animate-[mgStarPop_.5s_cubic-bezier(.3,1.6,.5,1)_both]' : ''
                    }`}
                    style={animate ? { animationDelay: `${0.15 + n * 0.22}s` } : undefined}
                />
            ))}
        </div>
    )
}

export function TimerBar({ fraction, label, urgent }: { fraction: number; label: string; urgent?: boolean }) {
    const pct = Math.max(0, Math.min(1, fraction)) * 100
    return (
        <div className="flex items-center gap-2">
            <MaterialIcon name="timer" className={`text-lg ${urgent ? 'text-red-500' : 'text-[#0275FB]'}`} />
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/80 ring-1 ring-[#0275FB]/15">
                <div
                    className={`h-full rounded-full transition-[width] duration-150 ease-linear ${urgent ? 'bg-red-500' : 'bg-[#0275FB]'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`w-12 text-right text-xs font-black tabular-nums ${urgent ? 'text-red-600' : 'text-[#0F1B33]'}`}>{label}</span>
        </div>
    )
}

export function HudChip({ icon, children, tone = 'default' }: { icon: string; children: ReactNode; tone?: 'default' | 'warn' | 'good' }) {
    const tones = {
        default: 'bg-white text-[#0F1B33] ring-[#0275FB]/15',
        warn: 'bg-red-50 text-red-700 ring-red-200',
        good: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    }
    return (
        <span className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-xs font-black ring-1 ${tones[tone]}`}>
            <MaterialIcon name={icon} className="text-base" />
            {children}
        </span>
    )
}

export function IntroCard({
    meta,
    title,
    prompt,
    levelNo,
    image,
    onStart,
    disabled,
}: {
    meta: EngineMeta
    title: string
    prompt?: string
    levelNo: number | null
    image: string
    onStart: () => void
    disabled?: boolean
}) {
    return (
        <section className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-24px_rgba(2,117,251,0.45)] ring-1 ring-[#0275FB]/10">
            <div className="relative h-44 overflow-hidden bg-[#0F1B33] sm:h-56">
                <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" draggable={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B33] via-[#0F1B33]/40 to-transparent" />
                <img
                    src={`/images/characters/${meta.character}.png`}
                    alt=""
                    className="absolute bottom-0 right-3 h-[92%] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] sm:right-8"
                    draggable={false}
                />
                <div className="absolute bottom-4 left-4 right-28 sm:left-6">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-[#FDC908] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#0F1B33]">
                        <MaterialIcon name={meta.icon} className="text-sm" />
                        {levelNo ? `Thử thách ${levelNo}` : 'Mini game'}
                    </p>
                    <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">{title}</h2>
                </div>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
                {prompt && (
                    <p className="rounded-2xl bg-[#FFF2C3] px-4 py-3 text-sm font-bold leading-relaxed text-[#5C4500]">
                        <MaterialIcon name="campaign" className="mr-1 align-[-3px] text-base" />
                        {prompt}
                    </p>
                )}
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Cách chơi</p>
                    <ol className="mt-2 space-y-2">
                        {meta.howTo.map((line, index) => (
                            <li key={line} className="flex gap-3 text-sm leading-snug text-[#0F1B33]">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DCEBFF] text-xs font-black text-[#0275FB]">
                                    {index + 1}
                                </span>
                                {line}
                            </li>
                        ))}
                    </ol>
                </div>
                <button
                    type="button"
                    onClick={onStart}
                    disabled={disabled}
                    data-testid="minigame-start"
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0275FB] text-base font-black text-white shadow-[0_6px_0_#0159C2] transition active:translate-y-[3px] active:shadow-[0_3px_0_#0159C2] disabled:opacity-50"
                >
                    <MaterialIcon name="play_arrow" className="text-2xl" /> Bắt đầu
                </button>
            </div>
        </section>
    )
}

function sourceLabel(url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, '')
    } catch {
        return 'nguồn'
    }
}

const HEADLINE = ['Chưa qua được', 'Qua thử thách!', 'Làm tốt lắm!', 'Xuất sắc!']

export function ResultCard({
    result,
    character,
    onReplay,
    backHref,
    backLabel,
    extra,
}: {
    result: MinigameAttemptResult
    character: Character
    onReplay: () => void
    backHref: string
    backLabel: string
    extra?: ReactNode
}) {
    const stars = Math.max(0, Math.min(3, result.stars))
    return (
        <section
            data-testid="minigame-result"
            className="overflow-hidden rounded-3xl bg-white text-center shadow-[0_20px_50px_-24px_rgba(2,117,251,0.45)] ring-1 ring-[#0275FB]/10 motion-safe:animate-[mgRise_.35s_ease-out]"
        >
            <div className={`relative px-5 pb-6 pt-7 ${result.passed ? 'bg-gradient-to-b from-[#DCEBFF] to-white' : 'bg-gradient-to-b from-slate-100 to-white'}`}>
                <img
                    src={characterFace(character, result.passed ? 'happy' : 'surprised')}
                    alt=""
                    className="mx-auto h-24 w-20 object-contain"
                    draggable={false}
                />
                <h2 className="mt-2 text-2xl font-black text-[#0F1B33]">{HEADLINE[stars]}</h2>
                <div className="mt-3">
                    <Stars value={stars} animate />
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {result.discoveryRecorded && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FDC908] px-3 py-1 text-xs font-black text-[#0F1B33]">
                            <MaterialIcon name="bolt" className="text-sm" /> +{result.discoveryXp} XP · Đã tính vào nhiệm vụ
                        </span>
                    )}
                    {!result.passed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                            Cần ít nhất 1 sao để tính vào nhiệm vụ
                        </span>
                    )}
                </div>
            </div>
            {result.learnFact && (
                <div className="mx-5 mb-5 rounded-2xl border border-[#FDC908]/60 bg-[#FFF8DC] p-4 text-left">
                    <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#8A6A00]">
                        <MaterialIcon name="lightbulb" className="text-base" /> Bạn có biết
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[#0F1B33]">{result.learnFact}</p>
                    {result.learnUrl && (
                        <a
                            href={result.learnUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#0275FB] underline-offset-2 hover:underline"
                        >
                            Nguồn: {sourceLabel(result.learnUrl)} <MaterialIcon name="open_in_new" className="text-xs" />
                        </a>
                    )}
                </div>
            )}
            <div className="flex flex-col gap-2 px-5 pb-6 sm:flex-row sm:justify-center">
                <button
                    type="button"
                    onClick={onReplay}
                    data-testid="minigame-replay"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-[#0275FB]/25 bg-white px-5 text-sm font-black text-[#0275FB]"
                >
                    <MaterialIcon name="replay" className="text-lg" /> {result.passed ? 'Thử thách tiếp' : 'Chơi lại'}
                </button>
                <Link
                    to={backHref}
                    data-testid="minigame-back"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#0275FB] px-5 text-sm font-black text-white shadow-[0_5px_0_#0159C2]"
                >
                    <MaterialIcon name="flag" className="text-lg" /> {backLabel}
                </Link>
                {extra}
            </div>
        </section>
    )
}
