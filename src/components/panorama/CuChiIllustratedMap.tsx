// src/components/panorama/CuChiIllustratedMap.tsx
import { useMemo, useState } from 'react'
import type { Panorama } from '../../features/panorama/api'
import {
    CU_CHI_ILLUSTRATED_PINS,
    CU_CHI_ILLUSTRATED_PIN_BY_ID,
    CU_CHI_MAP_IMAGE,
} from '../../features/panorama/cuChiIllustratedMapPins'
import { MaterialIcon } from '../ui/MaterialIcon'
import { resolveMediaUrl } from '../../shared/config/env'

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
        <section className={`relative w-full h-full overflow-hidden bg-[#0B1120] select-none ${className}`}>

            {/* Khối trung tâm bản đồ */}
            <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-6">
                <div
                    className="relative shadow-[0_0_60px_rgba(2,117,251,0.15)] rounded-3xl overflow-hidden border border-[#0275FB]/20 bg-[#1E293B]"
                    style={{
                        aspectRatio: `${MAP_W} / ${MAP_H}`,
                        height: '100%',
                        maxHeight: '100%',
                        maxWidth: '100%',
                    }}
                >
                    <img
                        src={resolveMediaUrl(CU_CHI_MAP_IMAGE)}
                        alt="Sơ đồ Khu di tích Địa đạo Củ Chi — Bến Dược"
                        className="absolute inset-0 w-full h-full object-fill opacity-90"
                        draggable={false}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/80 via-transparent to-transparent pointer-events-none" />

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
                            stroke="#FDC908"
                            strokeDasharray="4 4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.8}
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
                                        ? 'w-10 h-10 bg-gradient-to-br from-[#FDC908] to-[#D97706] text-[#1E293B] ring-4 ring-[#FDC908]/50 shadow-[0_0_30px_#FDC908] scale-125 z-30'
                                        : isHover
                                            ? 'w-8 h-8 bg-[#0275FB] text-white ring-4 ring-[#0275FB]/40 scale-110 z-30 shadow-[0_0_20px_#0275FB]'
                                            : 'w-7 h-7 bg-white/90 text-[#0275FB] border-2 border-[#0275FB] hover:scale-110 shadow-md'
                                }`}
                                style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                                onMouseEnter={() => setHoveredId(pin.id)}
                                onMouseLeave={() => setHoveredId((cur) => (cur === pin.id ? null : cur))}
                                onFocus={() => setHoveredId(pin.id)}
                                onBlur={() => setHoveredId((cur) => (cur === pin.id ? null : cur))}
                                onClick={() => onSelectPanorama(pin.id)}
                                aria-label={`${pin.routeOrder}. ${pin.label}`}
                            >
                                {active && <span className="absolute inset-0 rounded-full bg-[#FDC908] animate-ping opacity-50 pointer-events-none" />}
                                <span className="text-xs sm:text-sm tracking-tighter">{pin.routeOrder}</span>
                            </button>
                        )
                    })}

                    {/* Thẻ Hover Hologram - Glassmorphism UI */}
                    {hovered && hoveredPano && (
                        <div
                            className="absolute z-50 w-64 rounded-2xl bg-white/95 border border-[#0275FB]/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden pointer-events-none animate-[fadeIn_0.2s_ease-out]"
                            style={{
                                left: `${hovered.xPct}%`,
                                top: `${hovered.yPct}%`,
                                transform: `translate(-50%, ${hovered.yPct < 48 ? '24px' : 'calc(-100% - 24px)'})`,
                            }}
                        >
                            <div className="h-32 w-full relative overflow-hidden bg-[#1E293B]">
                                <img
                                    src={thumbUrl(hoveredPano.imageUrl)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent" />
                                <span className="absolute top-2 left-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-black text-[#FDC908] tracking-widest">
                                    ĐIỂM {hovered.routeOrder} / {pins.length}
                                </span>
                            </div>
                            <div className="p-4 space-y-1.5 text-left bg-white">
                                <p className="font-black text-sm text-[#1E293B] leading-snug line-clamp-2">
                                    {hoveredPano.title}
                                </p>
                                <p className="text-[11px] font-bold text-[#0275FB] flex items-center gap-1.5">
                                    <MaterialIcon name="360" className="text-sm animate-spin" />
                                    <span>Click để vào không gian 360°</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Thông tin bảng chỉ dẫn (Legend) góc trên */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/95 backdrop-blur-xl border border-[#CBD5E1] px-5 py-3 rounded-2xl flex items-center gap-4 z-30 shadow-xl pointer-events-none">
                <div className="w-10 h-10 rounded-xl bg-[#0275FB]/10 border border-[#0275FB]/30 flex items-center justify-center text-[#0275FB] shrink-0">
                    <MaterialIcon name="map" className="text-xl" />
                </div>
                <div>
                    <span className="font-black text-[#1E293B] text-xs sm:text-sm block leading-none">
                        Sơ Đồ Khu Di Tích Bến Dược
                    </span>
                    <span className="text-[10px] font-bold text-[#64748B] mt-1.5 block uppercase tracking-wide">
                        {pins.length} Trạm thực tế ảo • Lộ trình 1 → {pins.length}
                    </span>
                </div>
            </div>

        </section>
    )
}