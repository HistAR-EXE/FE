// src/features/minigame/engines/XepTangGame.tsx
// Xếp tầng: đặt thẻ tác dụng vào đúng tầng trên mặt cắt địa đạo. Bấm Kiểm tra thì BE báo thẻ nào sai
// (không lộ tầng đúng); thẻ sai quay về khay, thẻ đúng được khoá lại.

import { useEffect, useState } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import type { EngineProps } from '../engineTypes'
import { HudChip } from '../MinigameChrome'
import { buzz, sfx } from '../sfx'

type Drop = { itemId: string; floorId: string }

const FLOOR_BG = ['from-[#9a7148] to-[#86603b]', 'from-[#7a5634] to-[#664629]', 'from-[#56391f] to-[#422a16]', 'from-[#3a2614] to-[#2b1b0d]']

function Tank() {
    return (
        <svg viewBox="0 0 120 50" className="h-9 w-auto" aria-hidden>
            <rect x="18" y="22" width="78" height="16" rx="6" fill="#3d4a2f" />
            <rect x="38" y="10" width="36" height="14" rx="5" fill="#4b5a39" />
            <rect x="72" y="14" width="44" height="5" rx="2" fill="#3d4a2f" />
            <rect x="12" y="36" width="90" height="10" rx="5" fill="#222" />
            {[22, 38, 54, 70, 86].map((cx) => (
                <circle key={cx} cx={cx} cy="41" r="4" fill="#555" />
            ))}
        </svg>
    )
}

export function XepTangGame({ view, submit, onResolved, say }: EngineProps) {
    const items = view.items ?? []
    const floors = view.floors ?? []
    const [placement, setPlacement] = useState<Record<string, string>>({})
    const [locked, setLocked] = useState<Record<string, boolean>>({})
    const [selected, setSelected] = useState<string | null>(null)
    const [history, setHistory] = useState<Drop[]>([])
    const [flash, setFlash] = useState<string[]>([])
    const [mistakes, setMistakes] = useState(0)
    const [mistakesLeft, setMistakesLeft] = useState<number | null>(null)
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)

    useEffect(() => {
        say({ text: 'Địa đạo có ba tầng chồng lên nhau. Tầng nào chịu được gì? Chọn thẻ rồi đặt vào tầng nhé.' })
    }, [say])

    const tray = items.filter((item) => !placement[item.id])
    const unlockedPlaced = items.filter((item) => placement[item.id] && !locked[item.id])
    const allPlaced = items.length > 0 && items.every((item) => placement[item.id])

    const pick = (itemId: string) => {
        if (done || busy || locked[itemId]) return
        sfx.tap()
        setSelected((current) => (current === itemId ? null : itemId))
    }

    const placeOn = (floorId: string) => {
        if (!selected || done || busy) return
        sfx.rotate()
        setPlacement((current) => ({ ...current, [selected]: floorId }))
        setSelected(null)
    }

    const unplace = (itemId: string) => {
        if (done || busy || locked[itemId]) return
        sfx.tap()
        setPlacement((current) => {
            const next = { ...current }
            delete next[itemId]
            return next
        })
        setSelected(itemId)
    }

    const check = async () => {
        if (!allPlaced || busy || done) return
        const fresh = unlockedPlaced.map((item) => ({ itemId: item.id, floorId: placement[item.id] }))
        const nextHistory = [...history, ...fresh]
        setBusy(true)
        const outcome = await submit({ drops: nextHistory })
        setBusy(false)
        if (outcome.kind === 'error') return
        setHistory(nextHistory)
        if (outcome.kind === 'pending') {
            const wrong = outcome.hint.wrong ?? []
            setMistakes(outcome.hint.mistakes ?? 0)
            setMistakesLeft(outcome.hint.mistakesLeft ?? null)
            setLocked((current) => {
                const next = { ...current }
                fresh.forEach((drop) => {
                    if (!wrong.includes(drop.itemId)) next[drop.itemId] = true
                })
                return next
            })
            setPlacement((current) => {
                const next = { ...current }
                wrong.forEach((id) => delete next[id])
                return next
            })
            setFlash(wrong)
            window.setTimeout(() => setFlash([]), 600)
            sfx.bad()
            buzz(80)
            say({
                text:
                    wrong.length === 1
                        ? 'Có 1 thẻ đặt chưa đúng tầng, Anh Ba đã trả nó về khay. Nghĩ xem tầng nào sâu hơn thì chịu được gì.'
                        : `Có ${wrong.length} thẻ đặt chưa đúng tầng. Thử lại nhé, càng sâu càng chịu được bom đạn lớn.`,
                mood: 'surprised',
            })
            return
        }
        setDone(true)
        if (outcome.result.stars > 0) {
            setLocked(Object.fromEntries(items.map((item) => [item.id, true])))
            sfx.win()
            buzz([30, 40, 60])
            say({ text: 'Chuẩn rồi! Ba tầng chồng lên nhau nên một tầng bị đánh sập vẫn còn tầng khác để trú.' })
        } else {
            sfx.lose()
            say({ text: 'Sai nhiều quá rồi. Đọc kỹ độ sâu từng tầng rồi chơi lại nhé.', mood: 'surprised' })
        }
        window.setTimeout(() => onResolved(outcome.result), 1300)
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <HudChip icon="style">
                    Đã đặt {items.filter((item) => placement[item.id]).length}/{items.length}
                </HudChip>
                <HudChip icon="close" tone={mistakes > 0 ? 'warn' : 'default'}>
                    Sai {mistakes}
                    {mistakesLeft !== null && <span className="font-bold opacity-70">· còn {mistakesLeft} lần</span>}
                </HudChip>
            </div>

            {/* Mặt cắt địa đạo */}
            <div className="overflow-hidden rounded-3xl shadow-[0_18px_40px_-18px_rgba(15,27,51,0.7)] ring-4 ring-white" data-testid="xep-tang-board">
                <div className="relative flex h-16 items-end justify-between bg-gradient-to-b from-[#bfe0ff] to-[#e9f5ff] px-4">
                    <span className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#0F1B33]/60">Mặt đất</span>
                    <div className="mb-1">
                        <Tank />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-2 bg-[#5c8a3c]" />
                </div>
                {floors.map((floor, index) => {
                    const here = items.filter((item) => placement[item.id] === floor.id)
                    const target = !!selected && !done
                    return (
                        <div
                            key={floor.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${floor.label}${floor.depth ? `, ${floor.depth}` : ''}`}
                            onClick={() => placeOn(floor.id)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    placeOn(floor.id)
                                }
                            }}
                            data-testid={`floor-${floor.id}`}
                            className={`relative flex min-h-[92px] w-full flex-col gap-2 bg-gradient-to-b px-4 py-3 text-left transition sm:flex-row sm:items-center ${FLOOR_BG[index] ?? FLOOR_BG[3]} ${
                                target ? 'outline outline-2 -outline-offset-4 outline-[#FDC908]/80' : ''
                            }`}
                        >
                            <div className="flex shrink-0 items-center gap-3 sm:w-44">
                                <span className="flex h-10 w-16 items-center justify-center rounded-full bg-[#140c06] text-xs font-black text-[#FDC908] shadow-[inset_0_3px_8px_rgba(0,0,0,0.6)]">
                                    {floor.label.replace('Tầng ', 'T')}
                                </span>
                                <span>
                                    <span className="block text-sm font-black text-white">{floor.label}</span>
                                    {floor.depth && <span className="block text-[11px] font-bold text-[#f3dcb8]">{floor.depth}</span>}
                                </span>
                            </div>
                            <div className="flex min-h-[44px] flex-1 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-white/25 bg-black/15 p-2">
                                {here.length === 0 && (
                                    <span className="px-2 text-xs font-bold text-white/60">{target ? 'Chạm để đặt thẻ vào đây' : 'Chưa có thẻ'}</span>
                                )}
                                {here.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        title={locked[item.id] ? 'Đã đúng' : 'Chạm để lấy thẻ ra'}
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            unplace(item.id)
                                        }}
                                        onKeyDown={(event) => event.stopPropagation()}
                                        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-2 text-left text-xs font-black shadow ${
                                            locked[item.id] ? 'bg-emerald-500 text-white' : 'bg-white text-[#0F1B33]'
                                        }`}
                                    >
                                        {locked[item.id] && <MaterialIcon name="check_circle" className="text-sm" />}
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Khay thẻ */}
            <div className="rounded-3xl bg-white p-4 ring-1 ring-[#0275FB]/10">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {tray.length ? 'Khay thẻ · chọn một thẻ' : 'Đã đặt hết thẻ'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {tray.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => pick(item.id)}
                            data-testid={`card-${item.id}`}
                            className={`min-h-[44px] rounded-2xl border-2 px-4 py-2 text-left text-sm font-black transition ${
                                selected === item.id
                                    ? '-translate-y-0.5 border-[#FDC908] bg-[#FFF2C3] text-[#0F1B33] shadow-[0_6px_0_#E0B000]'
                                    : 'border-[#0275FB]/15 bg-[#F2F7FF] text-[#0F1B33]'
                            } ${flash.includes(item.id) ? 'mg-shake border-red-400 bg-red-50' : ''}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => void check()}
                    disabled={!allPlaced || busy || done}
                    data-testid="xep-tang-check"
                    className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0275FB] text-sm font-black text-white shadow-[0_5px_0_#0159C2] transition active:translate-y-[3px] disabled:bg-slate-300 disabled:shadow-none"
                >
                    <MaterialIcon name="fact_check" className="text-lg" />
                    {busy ? 'Đang kiểm tra…' : allPlaced ? 'Kiểm tra' : 'Đặt hết thẻ để kiểm tra'}
                </button>
            </div>
        </div>
    )
}
