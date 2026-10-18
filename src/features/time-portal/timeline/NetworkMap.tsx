// src/features/time-portal/timeline/NetworkMap.tsx
// Sơ đồ minh hoạ (không theo tỉ lệ) mạng lưới địa đạo Củ Chi qua từng thời kỳ:
// 1948 vài đoạn rời rạc → 1968 mạng liên hoàn → 1975 bàn đạp về Sài Gòn → nay bảo tồn.

import type { EraValue } from '../eraLabels'

const DISTRICT =
  'M48 120 C 44 84, 74 46, 122 36 C 170 26, 228 20, 266 34 C 296 46, 300 84, 290 116 C 280 156, 248 196, 196 208 C 146 218, 96 206, 66 182 C 50 168, 50 146, 48 120 Z'
const RIVER = 'M196 0 C 226 22, 286 24, 300 56 C 312 86, 294 118, 306 148 C 316 176, 302 204, 320 232'

const EARLY = ['M110 170 L 121 163 L 131 168', 'M158 191 L 170 185 L 181 189']

const NETWORK = [
  'M168 192 C 172 162, 184 132, 204 112 C 220 96, 238 82, 262 70',
  'M204 112 L 152 122 L 112 142',
  'M184 142 L 232 152 L 262 132',
  'M152 122 L 124 92 L 152 62 L 214 58',
  'M214 58 L 262 70',
  'M112 142 L 82 162',
  'M232 152 L 250 184',
  'M124 92 L 84 104 L 66 132',
  'M262 70 L 284 96 L 272 130',
  'M168 192 L 118 172',
  'M152 62 L 190 44 L 240 42',
]

const JUNCTIONS: [number, number][] = [
  [204, 112],
  [152, 122],
  [184, 142],
  [232, 152],
  [124, 92],
  [152, 62],
  [214, 58],
  [262, 70],
  [112, 142],
]

const PLACES = {
  benDinh: { x: 214, y: 58, label: 'Bến Đình' },
  benDuoc: { x: 262, y: 70, label: 'Bến Dược' },
  tpt: { x: 170, y: 194, label: 'Tân Phú Trung' },
  pva: { x: 118, y: 172, label: 'Phước Vĩnh An' },
}

function draw(i: number) {
  return { animation: `tp-draw 1.3s ${i * 70}ms ease-out both` }
}

export function NetworkMap({ era, accent }: { era: EraValue; accent: string }) {
  const showNetwork = era !== 1948
  const dim = era === 2026
  const lineColor = dim ? 'rgba(255,255,255,0.32)' : accent

  return (
    <svg key={era} viewBox="0 0 320 232" className="h-auto w-full" role="img" aria-label="Sơ đồ mạng lưới địa đạo Củ Chi theo thời kỳ">
      <path d={DISTRICT} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" strokeDasharray="4 3" />
      <path d={RIVER} fill="none" stroke="#38bdf8" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
      <text x="300" y="20" textAnchor="end" fontSize="9" fill="#7dd3fc" fillOpacity="0.85">
        Sông Sài Gòn
      </text>

      {/* Hướng về Sài Gòn */}
      <g opacity={era === 1975 ? 1 : 0.5}>
        <path
          d="M232 204 L 296 224"
          fill="none"
          stroke={era === 1975 ? accent : 'rgba(255,255,255,0.45)'}
          strokeWidth={era === 1975 ? 3 : 1.5}
          strokeDasharray="5 4"
          className="tp-anim"
          style={era === 1975 ? { animation: 'tp-dash 1s linear infinite' } : undefined}
        />
        <path d="M296 224 l -9 -7 l -1 9 z" fill={era === 1975 ? accent : 'rgba(255,255,255,0.45)'} />
        <text x="238" y="226" fontSize="9" fill="#fff" fillOpacity="0.75">
          Sài Gòn ~70 km
        </text>
      </g>

      {/* 1948: vài đoạn rời rạc */}
      {era === 1948 &&
        EARLY.map((d, i) => (
          <path key={d} d={d} pathLength={1} strokeDasharray="1" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="tp-anim" style={draw(i)} />
        ))}
      {era === 1948 && (
        <g>
          <path d="M133 170 L 156 188" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="2 3" />
          <path d="M141 175 l6 6 M147 175 l-6 6" stroke="#fecaca" strokeWidth="1.6" />
        </g>
      )}

      {/* Mạng liên hoàn */}
      {showNetwork &&
        NETWORK.map((d, i) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            strokeDasharray="1"
            fill="none"
            stroke={lineColor}
            strokeWidth={i === 0 ? 4 : 2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="tp-anim"
            style={draw(i)}
          />
        ))}
      {showNetwork &&
        !dim &&
        JUNCTIONS.map(([x, y], i) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#fff" className="tp-anim" style={{ animation: `tp-fade-in 0.4s ${0.6 + i * 0.06}s both` }} />
        ))}

      {/* Địa danh */}
      {(era === 1948 ? [PLACES.tpt, PLACES.pva] : era === 2026 ? [PLACES.benDinh, PLACES.benDuoc] : [PLACES.tpt, PLACES.benDuoc]).map((p) => (
        <g key={p.label}>
          {era === 2026 && (
            <circle cx={p.x} cy={p.y} r="6" fill={accent} opacity="0.6" className="tp-anim" style={{ transformOrigin: `${p.x}px ${p.y}px`, animation: 'tp-ping 1.8s ease-out infinite' }} />
          )}
          <circle cx={p.x} cy={p.y} r="4.5" fill={era === 2026 ? accent : '#fff'} stroke="#000" strokeOpacity="0.5" />
          <text
            x={p.x + (p === PLACES.benDuoc ? -8 : 8)}
            y={p.y + (p === PLACES.tpt ? 14 : p === PLACES.pva ? -9 : -9)}
            textAnchor={p === PLACES.benDuoc ? 'end' : 'start'}
            fontSize="10"
            fontWeight="600"
            fill="#fff"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
