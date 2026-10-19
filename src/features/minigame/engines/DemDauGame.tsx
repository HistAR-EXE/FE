// src/features/minigame/engines/DemDauGame.tsx
// Đếm lỗ thông hơi (engine san_co_vat, chế độ đếm): chạm vào ảnh để cắm dấu từng lỗ, chạm lại để bỏ, rồi chốt số.
// BE chỉ chấm con số (lệch 0 = 3 sao, lệch 1 = 2 sao, lệch 2 = 1 sao).

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import type { EngineProps } from '../engineTypes'
import { HudChip } from '../MinigameChrome'
import { buzz, sfx } from '../sfx'

type Pin = { id: number; x: number; y: number }

const MAX_PINS = 15

export function DemDauGame({ view, submit, onResolved, say }: EngineProps) {
    const [pins, setPins] = useState<Pin[]>([])
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)
    const seqRef = useRef(0)

    useEffect(() => {
        say({ text: 'Lỗ thông hơi được giấu dưới lá. Thấy lỗ nào thì chạm vào để cắm dấu, đếm xong thì chốt.' })
    }, [say])

    const addPin = (event: PointerEvent<HTMLDivElement>) => {
        if (busy || done || pins.length >= MAX_PINS) return
        const rect = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 100
        const y = ((event.clientY - rect.top) / rect.height) * 100
        sfx.tap()
        const id = ++seqRef.current
        setPins((current) => [...current, { id, x, y }])
    }

    const removePin = (id: number) => {
        if (busy || done) return
        sfx.rotate()
        setPins((current) => current.filter((pin) => pin.id !== id))
    }

    const lockIn = async () => {
        if (busy || done) return
        setBusy(true)
        const outcome = await submit({ count: pins.length })
        setBusy(false)
        if (outcome.kind !== 'done') return
        setDone(true)
        const stars = outcome.result.stars
        if (stars >= 3) {
            sfx.win()
            buzz([30, 40, 60])
            say({ text: `Chính xác, ${pins.length} lỗ! Mắt bạn tinh thật.` })
        } else if (stars > 0) {
            sfx.good()
            say({ text: `Gần đúng rồi! Bạn đếm ${pins.length}, còn lệch một chút.`, mood: 'surprised' })
        } else {
            sfx.lose()
            say({ text: `Lệch nhiều quá. Bạn đếm ${pins.length}. Thử lại và soi kỹ từng góc nhé.`, mood: 'surprised' })
        }
        window.setTimeout(() => onResolved(outcome.result), 1300)
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <HudChip icon="pin_drop" tone={pins.length ? 'good' : 'default'}>
                    Đã đánh dấu {pins.length}
                </HudChip>
                <HudChip icon="touch_app">Chạm dấu để bỏ</HudChip>
            </div>
            <div
                className="relative aspect-[3/2] w-full cursor-crosshair select-none overflow-hidden rounded-3xl bg-[#1d140d] shadow-[0_18px_40px_-18px_rgba(15,27,51,0.7)] ring-4 ring-white"
                style={{ touchAction: 'manipulation' }}
                onPointerDown={addPin}
                data-testid="dem-dau-stage"
                role="button"
                aria-label="Ảnh nền lá, chạm để đánh dấu lỗ thông hơi"
            >
                {view.imageUrl && <img src={view.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(0,0,0,0.5)]" />
                {pins.map((pin, index) => (
                    <button
                        key={pin.id}
                        type="button"
                        onPointerDown={(event) => {
                            event.stopPropagation()
                            removePin(pin.id)
                        }}
                        aria-label={`Bỏ dấu số ${index + 1}`}
                        className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FDC908] text-sm font-black text-[#0F1B33] shadow-[0_3px_0_#C99A00] ring-2 ring-white motion-safe:animate-[mgMarkIn_.2s_ease-out_both]"
                        style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={() => void lockIn()}
                disabled={busy || done || pins.length === 0}
                data-testid="dem-dau-submit"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0275FB] text-base font-black text-white shadow-[0_5px_0_#0159C2] transition active:translate-y-[3px] disabled:bg-slate-300 disabled:shadow-none"
            >
                <MaterialIcon name="task_alt" className="text-xl" />
                {pins.length ? `Chốt: ${pins.length} lỗ thông hơi` : 'Cắm dấu trước rồi chốt'}
            </button>
        </div>
    )
}
