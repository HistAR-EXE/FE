// src/components/panorama/CuChiIllustratedMap.tsx
import { useMemo, useState } from 'react'
import type { Panorama } from '../../features/panorama/api'
import {
    CU_CHI_ILLUSTRATED_PINS,
    CU_CHI_ILLUSTRATED_PIN_BY_ID,
    CU_CHI_MAP_IMAGE,
} from '../../features/panorama/cuChiIllustratedMapPins'
import { MaterialIcon } from '../ui/MaterialIcon'

const MAP_W = 2361
const MAP_H = 1663

type CuChiIllustratedMapProps = {
    panoramas: Panorama[]
    activePanoramaId: string | null
    onSelectPanorama: (id: string) => void
    className?: string
}

function thumbUrl(imageUrl: string): string {
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
    return path.replace(/\.png$/i, '.jpg')
}

export function CuChiIllustratedMap({
                                        panoramas,
                                        activePanoramaId,
                                        onSelectPanorama,
                                        className = '',
                                    }: CuChiIllustratedMapProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    const panoById = useMemo(
        () => Object.fromEntries(panoramas.map((p) => [p.id, p])),
        [panoramas],
    )

    const pins = useMemo(
        () =>
            CU_CHI_ILLUSTRATED_PINS.filter((pin) => panoById[pin.id]).sort(
                (a, b) => a.routeOrder - b.routeOrder,
            ),
        [panoById],
    )

    const routePoints = pins.map((p) => `${p.xPct},${p.yPct}`).join(' ')
    const hovered = hoveredId ? CU_CHI_ILLUSTRATED_PIN_BY_ID[hoveredId] : null
    const hoveredPano = hoveredId ? panoById[hoveredId] : null

    return (
        <section className={`relative w-full h-full overflow-hidden bg-[#0b1628] select-none ${className}`}>

            {/* Khối trung tâm bản đồ */}
            <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-6">
                <div
                    className="relative shadow-[0_0_50px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden border-2 border-white/15 bg-[#12141f]"
                    style={{
                        aspectRatio: `${MAP_W} / ${MAP_H}`,
                        height: '100%',
                        maxHeight: '100%',
                        maxWidth: '100%',
                    }}
                >
                    <img
                        src={CU_CHI_MAP_IMAGE}
                        alt="Sơ đồ Khu di tích Địa đạo Củ Chi — Bến Dược"
                        className="absolute inset-0 w-full h-full object-fill filter contrast-105"
                        draggable={false}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

                    {/* Lộ trình dây chuyền kết nối các điểm chạm */}
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden
                    >
                        <polyline
                            points={routePoints}
                            fill="none"
                            stroke="#fdb438"
                            strokeDasharray="4 4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.85}
                            vectorEffect="non-scaling-stroke"
                            style={{ strokeWidth: 3 }}
                        />
                    </svg>

                    {/* Ghim Hologram 360° phát sáng */}
                    {pins.map((pin) => {
                        const active = pin.id === activePanoramaId
                        const isHover = pin.id === hoveredId
                        return (
                            <button
                                key={pin.id}
                                type="button"
                                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-black transition-all duration-300 cursor-pointer z-20 ${
                                    active
                                        ? 'w-9 h-9 bg-gradient-to-tr from-[#fe951c] to-[#fff2a1] text-black ring-4 ring-[#fe951c]/60 shadow-[0_0_25px_#fe951c] scale-125 z-30'
                                        : isHover
                                            ? 'w-8 h-8 bg-[#388cf1] text-white ring-4 ring-cyan-400/50 scale-110 z-30'
                                            : 'w-7 h-7 bg-[#161824]/90 text-[#fdb438] border-2 border-[#fdb438]/80 hover:scale-110 shadow-lg'
                                }`}
                                style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                                onMouseEnter={() => setHoveredId(pin.id)}
                                onMouseLeave={() => setHoveredId((cur) => (cur === pin.id ? null : cur))}
                                onFocus={() => setHoveredId(pin.id)}
                                onBlur={() => setHoveredId((cur) => (cur === pin.id ? null : cur))}
                                onClick={() => onSelectPanorama(pin.id)}
                                aria-label={`${pin.routeOrder}. ${pin.label}`}
                            >
                                {active && <span className="absolute inset-0 rounded-full bg-[#fe951c] animate-ping opacity-40 pointer-events-none" />}
                                <span className="text-xs sm:text-sm tracking-tighter">{pin.routeOrder}</span>
                            </button>
                        )
                    })}

                    {/* Thẻ Hover Hologram (ĐÃ CHỈNH NGƯỠNG yPct < 48 ĐỂ KHÔNG BỊ CHE KHUẤT Ở TRÊN) */}
                    {hovered && hoveredPano && (
                        <div
                            className="absolute z-50 w-64 rounded-2xl bg-[#161824]/95 border-2 border-[#fdb438]/60 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden pointer-events-none animate-[fadeIn_0.15s_ease-out]"
                            style={{
                                left: `${hovered.xPct}%`,
                                top: `${hovered.yPct}%`,
                                transform: `translate(-50%, ${hovered.yPct < 48 ? '24px' : 'calc(-100% - 24px)'})`,
                            }}
                        >
                            <div className="h-32 w-full relative overflow-hidden bg-black">
                                <img
                                    src={thumbUrl(hoveredPano.imageUrl)}
                                    alt=""
                                    className="w-full h-full object-cover filter contrast-105"
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#161824] via-transparent to-transparent" />
                                <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-black text-[#fdb438]">
                  ĐIỂM {hovered.routeOrder} / {pins.length}
                </span>
                            </div>
                            <div className="p-3 space-y-1 text-left">
                                <p className="font-black text-sm text-white leading-snug truncate">
                                    {hoveredPano.title}
                                </p>
                                <p className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                                    <MaterialIcon name="360" className="text-sm animate-spin" />
                                    <span>Nhấp chuột để tiến vào không gian 360°</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-[#161824]/90 backdrop-blur-xl border border-white/15 px-4 py-2.5 rounded-2xl flex items-center gap-3 z-30 shadow-2xl pointer-events-none">
                <div className="w-9 h-9 rounded-xl bg-[#fe951c]/20 border border-[#fdb438]/40 flex items-center justify-center text-[#fdb438] shrink-0">
                    <MaterialIcon name="map" className="text-lg" />
                </div>
                <div>
          <span className="font-black text-white text-xs sm:text-sm block leading-none">
            Sơ Đồ Khu Di Tích Bến Dược
          </span>
                    <span className="text-[10px] font-semibold text-gray-400 mt-1 block">
            {pins.length} Trạm thực tế ảo • Lộ trình khép kín 1 → {pins.length}
          </span>
                </div>
            </div>

        </section>
    )
}