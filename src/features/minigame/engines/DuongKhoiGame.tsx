// src/features/minigame/engines/DuongKhoiGame.tsx
// Đường khói (bếp Hoàng Cầm): xoay các đoạn rãnh để khói từ bếp đi qua hầm chứa khói rồi tản ra ở miệng thoát.
// FE tự tính khói chảy tới đâu, rò ở đâu; nối kín thì gửi góc xoay để BE chấm lại.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PipeCell, PipeDir } from '../api'
import type { EngineProps } from '../engineTypes'
import { HudChip } from '../MinigameChrome'
import { buzz, sfx } from '../sfx'

const ORDER: PipeDir[] = ['N', 'E', 'S', 'W']
const BASE: Record<string, PipeDir[]> = { straight: ['W', 'E'], elbow: ['N', 'E'], tee: ['W', 'N', 'E'] }
const DELTA: Record<PipeDir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
const OPPOSITE: Record<PipeDir, PipeDir> = { N: 'S', S: 'N', E: 'W', W: 'E' }
const EDGE: Record<PipeDir, [number, number]> = { N: [50, 0], E: [100, 50], S: [50, 100], W: [0, 50] }
const ROTATABLE = new Set(['straight', 'elbow', 'tee'])

type Grid = { cols: number; rows: number; cells: PipeCell[] }

function layout(view: EngineProps['view']): Grid {
    const raw = view.cells ?? []
    // Cấu hình cũ không có toạ độ: xếp thành một hàng.
    const cells = raw.map((cell, index) => ({ ...cell, x: cell.x ?? index, y: cell.y ?? 0 }))
    const cols = view.cols ?? Math.max(1, ...cells.map((cell) => (cell.x ?? 0) + 1))
    const rows = view.rows ?? Math.max(1, ...cells.map((cell) => (cell.y ?? 0) + 1))
    return { cols, rows, cells }
}

function openings(cell: PipeCell, turns: number): PipeDir[] {
    if (!ROTATABLE.has(cell.kind)) return cell.open ?? []
    return (BASE[cell.kind] ?? []).map((dir) => ORDER[(ORDER.indexOf(dir) + turns) % 4])
}

type Flow = { filled: Set<string>; leaks: { id: string; dir: PipeDir }[]; outletsReached: number; outletsTotal: number; solved: boolean }

function computeFlow(grid: Grid, turns: Record<string, number>): Flow {
    const at = new Map(grid.cells.map((cell) => [`${cell.x},${cell.y}`, cell]))
    const stove = grid.cells.find((cell) => cell.kind === 'stove')
    const outlets = grid.cells.filter((cell) => cell.kind === 'outlet')
    const filled = new Set<string>()
    const leaks: Flow['leaks'] = []
    if (!stove) return { filled, leaks, outletsReached: 0, outletsTotal: outlets.length, solved: false }
    const queue: PipeCell[] = [stove]
    filled.add(stove.id)
    while (queue.length) {
        const cell = queue.shift() as PipeCell
        for (const dir of openings(cell, turns[cell.id] ?? 0)) {
            const [dx, dy] = DELTA[dir]
            const next = at.get(`${(cell.x ?? 0) + dx},${(cell.y ?? 0) + dy}`)
            if (!next || !openings(next, turns[next.id] ?? 0).includes(OPPOSITE[dir])) {
                leaks.push({ id: cell.id, dir })
                continue
            }
            if (!filled.has(next.id)) {
                filled.add(next.id)
                queue.push(next)
            }
        }
    }
    const outletsReached = outlets.filter((cell) => filled.has(cell.id)).length
    return { filled, leaks, outletsReached, outletsTotal: outlets.length, solved: outlets.length > 0 && outletsReached === outlets.length && leaks.length === 0 }
}

function channel(dirs: PipeDir[]) {
    return dirs.map((dir) => `M50 50 L${EDGE[dir][0]} ${EDGE[dir][1]}`).join(' ')
}

function formatTime(ms: number) {
    const total = Math.floor(ms / 1000)
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function DuongKhoiGame({ view, submit, onResolved, say }: EngineProps) {
    const grid = useMemo(() => layout(view), [view])
    const [turns, setTurns] = useState<Record<string, number>>(() =>
        Object.fromEntries(grid.cells.filter((cell) => ROTATABLE.has(cell.kind)).map((cell) => [cell.id, cell.start ?? 0])),
    )
    const [moves, setMoves] = useState(0)
    const [elapsed, setElapsed] = useState(0)
    const [state, setState] = useState<'play' | 'checking' | 'won'>('play')
    const startRef = useRef(0)
    const submittedRef = useRef(false)
    const flow = useMemo(() => computeFlow(grid, turns), [grid, turns])
    const par = view.parMs ?? 0

    useEffect(() => {
        startRef.current = performance.now()
        say({ text: 'Khói mà bốc thẳng lên là lộ ngay. Dẫn khói qua hầm chứa cho nó tản ra đã!' })
    }, [say])

    useEffect(() => {
        if (state !== 'play') return
        const id = window.setInterval(() => setElapsed(performance.now() - startRef.current), 250)
        return () => window.clearInterval(id)
    }, [state])

    useEffect(() => {
        if (!flow.solved || submittedRef.current) return
        submittedRef.current = true
        setState('checking')
        sfx.good()
        say({ text: 'Khói đã đi hết rãnh, lên tới mặt đất chỉ còn làn mỏng bay là là. Đẹp lắm!' })
        const drops = Object.entries(turns).map(([itemId, value]) => ({ itemId, floorId: String(value % 4) }))
        // Để khói chạy hết rãnh một nhịp rồi mới chấm.
        window.setTimeout(async () => {
            const outcome = await submit({ drops })
            if (outcome.kind === 'done') {
                setState('won')
                sfx.win()
                buzz([30, 40, 60])
                window.setTimeout(() => onResolved(outcome.result), 1200)
                return
            }
            submittedRef.current = false
            setState('play')
            if (outcome.kind === 'pending') {
                say({ text: `Có ${outcome.hint.wrongCells ?? 1} đoạn rãnh chưa đúng hướng. Thử xoay lại xem.`, mood: 'surprised' })
            }
        }, 900)
    }, [flow.solved])

    const rotate = (cell: PipeCell) => {
        if (state !== 'play') return
        sfx.rotate()
        setMoves((value) => value + 1)
        setTurns((current) => ({ ...current, [cell.id]: (current[cell.id] ?? 0) + 1 }))
    }

    const width = grid.cols * 100
    const height = grid.rows * 100
    const leakCount = flow.leaks.length

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <HudChip icon="timer">
                    {formatTime(elapsed)}
                    {par > 0 && <span className="font-bold text-slate-400">/ mục tiêu {formatTime(par)}</span>}
                </HudChip>
                <HudChip icon="rotate_right">{moves} lần xoay</HudChip>
                <HudChip icon="cloud" tone={flow.outletsReached === flow.outletsTotal ? 'good' : 'default'}>
                    Miệng thoát {flow.outletsReached}/{flow.outletsTotal}
                </HudChip>
                {leakCount > 0 && state === 'play' && (
                    <HudChip icon="warning" tone="warn">
                        Rò khói {leakCount} chỗ
                    </HudChip>
                )}
            </div>

            <div className="overflow-hidden rounded-3xl bg-[#3b2a1d] shadow-[0_18px_40px_-18px_rgba(15,27,51,0.7)] ring-4 ring-white">
                <svg
                    viewBox={`0 -60 ${width} ${height + 60}`}
                    className="mx-auto block h-auto max-h-[64vh] w-full select-none"
                    role="img"
                    aria-label="Mặt cắt rãnh dẫn khói của bếp Hoàng Cầm"
                    data-testid="duong-khoi-board"
                >
                    <defs>
                        <linearGradient id="dk-soil" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#7a5636" />
                            <stop offset="1" stopColor="#3f2b1b" />
                        </linearGradient>
                        <linearGradient id="dk-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#bfe0ff" />
                            <stop offset="1" stopColor="#e9f5ff" />
                        </linearGradient>
                        <pattern id="dk-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                            <circle cx="4" cy="6" r="2" fill="#000" opacity="0.12" />
                            <circle cx="15" cy="16" r="1.5" fill="#fff" opacity="0.06" />
                        </pattern>
                    </defs>
                    {/* Trời và mặt đất */}
                    <rect x="0" y="-60" width={width} height="60" fill="url(#dk-sky)" />
                    {Array.from({ length: grid.cols * 3 }, (_, index) => (
                        <path
                            key={`tree-${index}`}
                            d={`M${index * 33 + 8} 0 q6 -${18 + (index % 3) * 8} 12 0`}
                            fill={index % 2 ? '#3f7d3a' : '#4f9446'}
                        />
                    ))}
                    <rect x="0" y="0" width={width} height={height} fill="url(#dk-soil)" />
                    <rect x="0" y="0" width={width} height={height} fill="url(#dk-dots)" />
                    <rect x="0" y="-4" width={width} height="8" fill="#5c8a3c" />

                    {/* Đá: ô không có đoạn rãnh */}
                    {Array.from({ length: grid.cols * grid.rows }, (_, index) => {
                        const x = index % grid.cols
                        const y = Math.floor(index / grid.cols)
                        if (grid.cells.some((cell) => cell.x === x && cell.y === y)) return null
                        const variant = (x * 7 + y * 3) % 3
                        const rocks = [
                            [
                                [34, 62, 20, 13],
                                [68, 36, 13, 9],
                            ],
                            [
                                [58, 58, 24, 15],
                                [26, 30, 9, 6],
                                [78, 82, 8, 5],
                            ],
                            [
                                [44, 40, 15, 10],
                                [70, 70, 18, 12],
                            ],
                        ][variant]
                        return (
                            <g key={`rock-${index}`} transform={`translate(${x * 100} ${y * 100})`} opacity="0.8">
                                {rocks.map(([cx, cy, rx, ry]) => (
                                    <g key={`${cx}-${cy}`}>
                                        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#2c1f15" />
                                        <ellipse cx={cx - rx * 0.25} cy={cy - ry * 0.35} rx={rx * 0.45} ry={ry * 0.3} fill="#5a4330" opacity="0.6" />
                                    </g>
                                ))}
                            </g>
                        )
                    })}

                    {grid.cells.map((cell) => {
                        const x = (cell.x ?? 0) * 100
                        const y = (cell.y ?? 0) * 100
                        const smoky = flow.filled.has(cell.id)
                        if (ROTATABLE.has(cell.kind)) {
                            const turn = turns[cell.id] ?? 0
                            const base = channel(BASE[cell.kind] ?? [])
                            return (
                                <g
                                    key={cell.id}
                                    transform={`translate(${x} ${y})`}
                                    onClick={() => rotate(cell)}
                                    className={state === 'play' ? 'cursor-pointer' : ''}
                                    data-testid={`pipe-${cell.id}`}
                                    role="button"
                                    aria-label={`Đoạn rãnh ${cell.id}, chạm để xoay`}
                                >
                                    <rect x="5" y="5" width="90" height="90" rx="16" fill={smoky ? '#9a7752' : '#8a6845'} stroke="#2c1f15" strokeWidth="3" />
                                    <g className="mg-tile" style={{ transform: `rotate(${turn * 90}deg)` }}>
                                        <rect x="0" y="0" width="100" height="100" fill="transparent" />
                                        <path d={base} stroke="#2a1c12" strokeWidth="34" strokeLinecap="round" fill="none" />
                                        <path d={base} stroke="#160e08" strokeWidth="22" strokeLinecap="round" fill="none" />
                                        {smoky && <path d={base} stroke="#ece9e2" strokeWidth="10" strokeLinecap="round" fill="none" className="mg-smoke" opacity="0.9" />}
                                    </g>
                                </g>
                            )
                        }
                        const dirs = openings(cell, 0)
                        const path = channel(dirs)
                        return (
                            <g key={cell.id} transform={`translate(${x} ${y})`} data-testid={`fixed-${cell.id}`}>
                                <path d={path} stroke="#2a1c12" strokeWidth="34" strokeLinecap="round" fill="none" />
                                <path d={path} stroke="#160e08" strokeWidth="22" strokeLinecap="round" fill="none" />
                                {smoky && <path d={path} stroke="#ece9e2" strokeWidth="10" strokeLinecap="round" fill="none" className="mg-smoke" opacity="0.9" />}
                                {cell.kind === 'stove' && (
                                    <g>
                                        <rect x="18" y="44" width="64" height="44" rx="10" fill="#6b4a31" stroke="#2c1f15" strokeWidth="3" />
                                        <ellipse cx="50" cy="44" rx="26" ry="9" fill="#3a3a3a" />
                                        <path d="M28 44 q22 -26 44 0 z" fill="#4a4a4a" />
                                        <rect x="44" y="20" width="12" height="6" rx="3" fill="#2f2f2f" />
                                        <g className="mg-flame">
                                            <path d="M38 88 q4 -16 12 -22 q8 6 12 22 z" fill="#ff8a1c" />
                                            <path d="M44 88 q3 -10 6 -13 q4 4 6 13 z" fill="#ffd34d" />
                                        </g>
                                        <text x="50" y="14" textAnchor="middle" fontSize="13" fontWeight="900" fill="#ffd34d">BẾP</text>
                                    </g>
                                )}
                                {cell.kind === 'chamber' && (
                                    <g>
                                        <ellipse cx="50" cy="52" rx="38" ry="30" fill="#1b120b" stroke="#4a3423" strokeWidth="4" />
                                        {smoky && (
                                            <g opacity="0.85">
                                                <circle cx="36" cy="54" r="13" fill="#d8d4cc" />
                                                <circle cx="56" cy="46" r="16" fill="#e6e2da" />
                                                <circle cx="66" cy="60" r="11" fill="#cfcac1" />
                                            </g>
                                        )}
                                        <text x="50" y="96" textAnchor="middle" fontSize="11" fontWeight="900" fill="#e9d3b5">HẦM KHÓI</text>
                                    </g>
                                )}
                                {cell.kind === 'outlet' && (
                                    <g>
                                        <path d="M50 50 L50 0" stroke="#2a1c12" strokeWidth="26" strokeLinecap="round" />
                                        <path d="M50 50 L50 0" stroke="#160e08" strokeWidth="16" strokeLinecap="round" />
                                        <ellipse cx="50" cy="-6" rx="30" ry="12" fill="#5c8a3c" />
                                        <ellipse cx="38" cy="-12" rx="14" ry="10" fill="#4f7f33" />
                                        <ellipse cx="62" cy="-12" rx="14" ry="10" fill="#467a2e" />
                                        {smoky && (
                                            <g opacity="0.8">
                                                <ellipse cx="40" cy="-24" rx="16" ry="7" fill="#f4f2ee" className="mg-mist" />
                                                <ellipse cx="60" cy="-30" rx="18" ry="7" fill="#f4f2ee" className="mg-mist" style={{ animationDelay: '0.8s' }} />
                                                <ellipse cx="50" cy="-40" rx="20" ry="7" fill="#f4f2ee" className="mg-mist" style={{ animationDelay: '1.6s' }} />
                                            </g>
                                        )}
                                    </g>
                                )}
                            </g>
                        )
                    })}

                    {/* Chỗ rò khói */}
                    {state === 'play' &&
                        flow.leaks.map((leak) => {
                            const cell = grid.cells.find((item) => item.id === leak.id)
                            if (!cell) return null
                            const [ex, ey] = EDGE[leak.dir]
                            const cx = (cell.x ?? 0) * 100 + ex
                            const cy = (cell.y ?? 0) * 100 + ey
                            return (
                                <g key={`${leak.id}-${leak.dir}`} pointerEvents="none">
                                    <circle cx={cx} cy={cy} r="16" fill="#f1efe9" opacity="0.75" className="mg-mist" />
                                    <circle cx={cx} cy={cy} r="11" fill="#ef4444" stroke="#fff" strokeWidth="3" />
                                    <text x={cx} y={cy + 5} textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff">
                                        !
                                    </text>
                                </g>
                            )
                        })}
                </svg>
            </div>
            <p className="text-center text-xs font-semibold text-slate-500">
                Chạm vào đoạn rãnh để xoay. Dấu <span className="font-black text-red-600">!</span> là chỗ khói đang rò ra ngoài.
            </p>
        </div>
    )
}
