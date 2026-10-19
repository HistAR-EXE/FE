// src/features/minigame/engines/DaoGapGame.tsx
// Đào gặp nhau: chọn hướng đào từ giếng của mình để gặp đồng đội đào từ giếng bên kia.
// Đào trượt thì BE chỉ báo tiếng cuốc ở bên trái hay bên phải, gần hay xa (không lộ hướng đúng).

import { useEffect, useState } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import type { EngineProps } from '../engineTypes'
import { HudChip } from '../MinigameChrome'
import { buzz, sfx } from '../sfx'

const MAX_TRIES = 6
const WELL = { x: 240, y: 330 }
const LENGTH = 250

type Tunnel = { angle: number; hit: boolean }
type Hint = { direction: 'HIGHER' | 'LOWER'; near: boolean } | null

function endPoint(angle: number, length = LENGTH) {
    const rad = (angle * Math.PI) / 180
    return { x: WELL.x + Math.sin(rad) * length, y: WELL.y - Math.cos(rad) * length }
}

function describe(angle: number) {
    if (angle === 0) return 'thẳng phía trước'
    return `${Math.abs(angle)}° ${angle > 0 ? 'sang phải' : 'sang trái'}`
}

const ROOTS = [
    'M20 60 q60 20 90 -10 t80 10',
    'M300 30 q40 30 90 10 t70 30',
    'M40 220 q50 -20 80 10',
    'M380 250 q40 -30 90 -10',
    'M150 140 q30 20 60 0',
]
const ROCKS = [
    [70, 120, 14],
    [410, 160, 18],
    [330, 260, 11],
    [120, 300, 12],
    [250, 70, 9],
    [180, 210, 8],
    [450, 60, 12],
]

export function DaoGapGame({ view, submit, onResolved, say }: EngineProps) {
    const min = view.angleMin ?? -60
    const max = view.angleMax ?? 60
    const [angle, setAngle] = useState(0)
    const [tunnels, setTunnels] = useState<Tunnel[]>([])
    const [digging, setDigging] = useState(false)
    const [hint, setHint] = useState<Hint>(null)
    const [met, setMet] = useState(false)
    const [over, setOver] = useState(false)

    useEffect(() => {
        say({ text: 'Đồng đội đang đào từ một giếng khác về phía mình. Chọn hướng rồi đào, nhớ lắng nghe tiếng cuốc!' })
    }, [say])

    const angles = tunnels.map((tunnel) => tunnel.angle)
    const triesLeft = MAX_TRIES - tunnels.length

    const nudge = (delta: number) => {
        if (digging || over) return
        sfx.tap()
        setAngle((value) => Math.max(min, Math.min(max, value + delta)))
    }

    const dig = async () => {
        if (digging || over) return
        setDigging(true)
        setHint(null)
        sfx.knock(0.5)
        const nextAngles = [...angles, angle]
        const outcome = await submit({ angles: nextAngles })
        if (outcome.kind === 'error') {
            setDigging(false)
            return
        }
        const hit = outcome.kind === 'done' && outcome.result.stars > 0
        setTunnels((current) => [...current, { angle, hit }])
        // Chờ đường hầm vẽ xong rồi mới báo kết quả.
        window.setTimeout(() => {
            setDigging(false)
            if (outcome.kind === 'pending') {
                const direction = outcome.hint.direction ?? 'HIGHER'
                const near = !!outcome.hint.near
                setHint({ direction, near })
                sfx.knock(near ? 0.9 : 0.35)
                buzz(near ? [40, 60, 40] : 60)
                say({
                    text: `Không gặp ai… Tiếng cuốc vọng từ phía ${direction === 'HIGHER' ? 'bên phải' : 'bên trái'}${near ? ', nghe rất gần rồi!' : ', còn khá xa.'}`,
                    mood: 'surprised',
                })
                return
            }
            if (outcome.kind === 'done') {
                setOver(true)
                if (hit) {
                    setMet(true)
                    sfx.win()
                    buzz([30, 40, 60])
                    say({ text: 'Cuốc chạm cuốc! Hai nhánh hầm đã thông nhau.' })
                } else {
                    sfx.lose()
                    say({ text: 'Hết lượt đào rồi. Lần sau chỉnh hướng theo tiếng cuốc nhé.', mood: 'surprised' })
                }
                window.setTimeout(() => onResolved(outcome.result), 1500)
            }
        }, 950)
    }

    const preview = endPoint(angle, 90)
    const last = tunnels[tunnels.length - 1]
    const lastEnd = last ? endPoint(last.angle) : null
    const partner = met && last ? endPoint(last.angle) : null

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <HudChip icon="hardware" tone={triesLeft <= 2 && !over ? 'warn' : 'default'}>
                    Còn {triesLeft} lần đào
                </HudChip>
                {view.distanceM && <HudChip icon="straighten">Hai giếng cách ~{view.distanceM} m</HudChip>}
                {hint && (
                    <HudChip icon="hearing" tone={hint.near ? 'good' : 'default'}>
                        Tiếng cuốc: {hint.direction === 'HIGHER' ? 'bên phải' : 'bên trái'} · {hint.near ? 'rất gần' : 'xa'}
                    </HudChip>
                )}
            </div>

            <div className="overflow-hidden rounded-3xl bg-[#7a5636] shadow-[0_18px_40px_-18px_rgba(15,27,51,0.7)] ring-4 ring-white">
                <svg viewBox="0 0 480 360" className="block h-auto w-full select-none" role="img" aria-label="Bản đồ lòng đất nhìn từ trên xuống" data-testid="dao-gap-map">
                    <defs>
                        <radialGradient id="dg-soil" cx="50%" cy="80%" r="90%">
                            <stop offset="0" stopColor="#9b7149" />
                            <stop offset="1" stopColor="#5a3d24" />
                        </radialGradient>
                        <pattern id="dg-grain" width="18" height="18" patternUnits="userSpaceOnUse">
                            <circle cx="3" cy="4" r="1.6" fill="#000" opacity="0.15" />
                            <circle cx="12" cy="13" r="1.2" fill="#fff" opacity="0.08" />
                        </pattern>
                    </defs>
                    <rect width="480" height="360" fill="url(#dg-soil)" />
                    <rect width="480" height="360" fill="url(#dg-grain)" />
                    {ROOTS.map((d) => (
                        <path key={d} d={d} stroke="#3d2716" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round" />
                    ))}
                    {ROCKS.map(([cx, cy, r]) => (
                        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={r} ry={r * 0.7} fill="#3f2c1c" opacity="0.7" />
                    ))}

                    {/* Các lần đào trước */}
                    {tunnels.map((tunnel, index) => {
                        const end = endPoint(tunnel.angle)
                        const isLast = index === tunnels.length - 1
                        return (
                            <g key={`${tunnel.angle}-${index}`} opacity={isLast ? 1 : 0.35}>
                                <line
                                    x1={WELL.x}
                                    y1={WELL.y}
                                    x2={end.x}
                                    y2={end.y}
                                    stroke="#1a0f07"
                                    strokeWidth="16"
                                    strokeLinecap="round"
                                    pathLength={1}
                                    strokeDasharray="1"
                                    style={isLast ? { animation: 'mgDig .9s ease-out both' } : undefined}
                                />
                                <line x1={WELL.x} y1={WELL.y} x2={end.x} y2={end.y} stroke="#2d1d10" strokeWidth="8" strokeLinecap="round" pathLength={1} strokeDasharray="1" style={isLast ? { animation: 'mgDig .9s ease-out both' } : undefined} />
                                {!tunnel.hit && !isLast && <circle cx={end.x} cy={end.y} r="6" fill="#ef4444" />}
                            </g>
                        )
                    })}

                    {/* Hướng đang chọn */}
                    {!over && (
                        <g pointerEvents="none">
                            <line x1={WELL.x} y1={WELL.y} x2={preview.x} y2={preview.y} stroke="#FDC908" strokeWidth="5" strokeDasharray="10 8" strokeLinecap="round" />
                            <circle cx={preview.x} cy={preview.y} r="9" fill="#FDC908" stroke="#0F1B33" strokeWidth="3" />
                        </g>
                    )}

                    {/* Tiếng cuốc sau lần trượt */}
                    {hint && lastEnd && !digging && (
                        <g pointerEvents="none" transform={`translate(${lastEnd.x} ${lastEnd.y})`}>
                            <circle r="18" fill="#fff" opacity="0.9" />
                            <text y="6" textAnchor="middle" fontSize="18" fontWeight="900" fill="#0275FB">
                                {hint.direction === 'HIGHER' ? '→' : '←'}
                            </text>
                            {[0, 1, 2].map((ring) => (
                                <circle
                                    key={ring}
                                    r={hint.near ? 26 + ring * 10 : 32 + ring * 16}
                                    fill="none"
                                    stroke={hint.near ? '#FDC908' : '#ffffff'}
                                    strokeWidth="2"
                                    opacity={0.7 - ring * 0.2}
                                />
                            ))}
                        </g>
                    )}

                    {/* Giếng đồng đội (chỉ hiện khi gặp) */}
                    {partner && (
                        <g>
                            <circle cx={partner.x} cy={partner.y} r="26" fill="#140b05" stroke="#d9b98f" strokeWidth="5" />
                            <circle cx={partner.x} cy={partner.y} r="40" fill="none" stroke="#FDC908" strokeWidth="4" className="motion-safe:animate-pulse" />
                            <text x={partner.x} y={partner.y - 48} textAnchor="middle" fontSize="15" fontWeight="900" fill="#FDC908">
                                ĐỒNG ĐỘI
                            </text>
                        </g>
                    )}

                    {/* Giếng của mình */}
                    <circle cx={WELL.x} cy={WELL.y} r="26" fill="#140b05" stroke="#d9b98f" strokeWidth="5" />
                    <rect x={WELL.x - 8} y={WELL.y - 18} width="16" height="36" fill="none" stroke="#d9b98f" strokeWidth="3" />
                    <text x={WELL.x + 34} y={WELL.y + 6} fontSize="13" fontWeight="900" fill="#fff3dc">
                        GIẾNG CỦA BẠN
                    </text>
                </svg>
            </div>

            <div className="rounded-3xl bg-white p-4 ring-1 ring-[#0275FB]/10">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Hướng đào</p>
                    <p className="text-sm font-black text-[#0F1B33]" data-testid="dao-gap-angle">
                        {describe(angle)}
                    </p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => nudge(-5)}
                        disabled={digging || over}
                        aria-label="Xoay sang trái 5 độ"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DCEBFF] text-[#0275FB] disabled:opacity-40"
                    >
                        <MaterialIcon name="rotate_left" />
                    </button>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={1}
                        value={angle}
                        disabled={digging || over}
                        onChange={(event) => setAngle(Number(event.target.value))}
                        aria-label="Hướng đào"
                        className="h-2 w-full cursor-pointer accent-[#0275FB]"
                    />
                    <button
                        type="button"
                        onClick={() => nudge(5)}
                        disabled={digging || over}
                        aria-label="Xoay sang phải 5 độ"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DCEBFF] text-[#0275FB] disabled:opacity-40"
                    >
                        <MaterialIcon name="rotate_right" />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => void dig()}
                    disabled={digging || over}
                    data-testid="dao-gap-dig"
                    className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FDC908] text-base font-black text-[#0F1B33] shadow-[0_5px_0_#C99A00] transition active:translate-y-[3px] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                    <MaterialIcon name="hardware" className="text-xl" /> {digging ? 'Đang đào…' : 'Đào!'}
                </button>
            </div>
        </div>
    )
}
