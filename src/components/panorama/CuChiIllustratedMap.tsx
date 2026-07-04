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

  // chỉ hiện ghim cho panorama thật sự có dữ liệu, theo đúng thứ tự lộ trình
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
    <section className={`tour360-illustrated-shell ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4">
        <div
          className="relative shadow-2xl rounded-2xl ring-1 ring-outline-variant/40"
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
            className="absolute inset-0 w-full h-full object-fill rounded-2xl select-none"
            draggable={false}
          />

          {/* lộ trình nối các điểm theo thứ tự */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline
              points={routePoints}
              fill="none"
              stroke="#44dbd5"
              strokeDasharray="3 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.75}
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2 }}
            />
          </svg>

          {/* ghim các điểm 360° */}
          {pins.map((pin) => {
            const active = pin.id === activePanoramaId
            const isHover = pin.id === hoveredId
            return (
              <button
                key={pin.id}
                type="button"
                className={`tour360-illustrated-pin ${active ? 'is-active' : ''} ${isHover ? 'is-hover' : ''}`}
                style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                onMouseEnter={() => setHoveredId(pin.id)}
                onMouseLeave={() => setHoveredId((cur) => (cur === pin.id ? null : cur))}
                onFocus={() => setHoveredId(pin.id)}
                onBlur={() => setHoveredId((cur) => (cur === pin.id ? null : cur))}
                onClick={() => onSelectPanorama(pin.id)}
                aria-label={`${pin.routeOrder}. ${pin.label}`}
              >
                <span className="tour360-illustrated-pin__num">{pin.routeOrder}</span>
              </button>
            )
          })}

          {/* thẻ hover: thumbnail + tên điểm */}
          {hovered && hoveredPano && (
            <div
              className="tour360-illustrated-hovercard"
              style={{
                left: `${hovered.xPct}%`,
                top: `${hovered.yPct}%`,
                transform: `translate(-50%, ${hovered.yPct < 24 ? '14px' : 'calc(-100% - 18px)'})`,
              }}
            >
              <div className="h-20 w-full overflow-hidden rounded-t-lg bg-surface-container">
                <img
                  src={thumbUrl(hoveredPano.imageUrl)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div className="px-2.5 py-1.5">
                <p className="font-title-md text-xs text-on-surface leading-snug">
                  {hoveredPano.title}
                </p>
                <p className="text-[10px] text-secondary mt-0.5 flex items-center gap-1">
                  <MaterialIcon name="panorama" className="text-sm" />
                  Nhấn để mở ảnh 360°
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-14 left-4 bg-surface-container-high/92 backdrop-blur-md border border-primary/30 px-4 py-2 rounded-full flex items-center gap-2 z-[6] max-w-[min(420px,92%)] shadow-lg pointer-events-none">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 shrink-0">
          <MaterialIcon name="map" className="text-primary text-base" />
        </span>
        <div className="min-w-0">
          <span className="font-title-md text-on-surface text-sm block truncate">
            Sơ đồ Khu di tích — Bến Dược
          </span>
          <span className="text-[10px] text-on-surface-variant">
            {pins.length} điểm 360° • Nhấn ghim theo lộ trình 1→{pins.length}
          </span>
        </div>
      </div>
    </section>
  )
}
