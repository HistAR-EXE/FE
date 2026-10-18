// src/features/time-portal/timeline/StoryArt.tsx
// Tranh minh hoạ SVG động cho các khoảnh khắc không có ảnh tư liệu phù hợp.
// Bố cục giữ chủ thể ở vùng giữa khung (x ≈ 560–1080) để không bị thẻ nội dung che.

import { useId, type ReactNode } from 'react'
import type { ArtKind } from './storyData'

const SVG_PROPS = {
  viewBox: '0 0 1600 900',
  preserveAspectRatio: 'xMidYMid slice',
  className: 'absolute inset-0 h-full w-full',
  'aria-hidden': true,
} as const

function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9]/g, '')
}

/* ------------------------------------------------------------------ */
/*  Lát cắt 3 tầng                                                     */
/* ------------------------------------------------------------------ */

const L1 = 'M40 400 C 250 380, 420 420, 620 396 S 980 382, 1170 404 S 1450 390, 1580 400'
const L2 = 'M100 592 C 320 572, 520 612, 760 586 S 1150 576, 1520 596'
const L3 = 'M240 792 C 480 772, 700 806, 920 782 S 1260 776, 1460 792'
const LINKS = [
  'M330 405 C 300 470, 372 522, 342 590',
  'M1170 404 C 1210 470, 1140 522, 1186 592',
  'M520 588 C 482 660, 562 720, 522 786',
  'M1390 596 C 1430 680, 1370 730, 1410 790',
  'M210 252 C 215 300, 190 350, 236 398',
  'M1250 252 C 1260 318, 1300 360, 1270 400',
]

function Person({ x, y, s = 1, c = '#2f4a24' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-46" r="9" fill="#d9a27a" />
      <path d="M-11 -36 h22 l4 30 h-30 z" fill={c} />
      <path d="M-8 -6 h7 v22 h-7 z M1 -6 h7 v22 h-7 z" fill="#2a2a24" />
    </g>
  )
}

function Room({ x, y, w, h, glow, children }: { x: number; y: number; w: number; h: number; glow: string; children?: ReactNode }) {
  const beams = Math.round(w / 22)
  return (
    <g>
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} rx="34" fill="#4a1b08" opacity="0.85" />
      <rect x={x} y={y} width={w} height={h} rx="28" fill={`url(#${glow})`} />
      {Array.from({ length: beams }, (_, i) => (
        <rect key={i} x={x + 10 + i * ((w - 20) / beams)} y={y + 4} width="10" height="14" rx="3" fill="#5a3416" />
      ))}
      <rect x={x + 10} y={y + h - 14} width={w - 20} height="8" rx="4" fill="#b37744" opacity="0.7" />
      {children}
    </g>
  )
}

function LayersArt() {
  const id = useSvgId()
  const tunnel = (d: string, w = 40) => (
    <g key={d}>
      <path d={d} fill="none" stroke="#4a1b08" strokeWidth={w + 14} strokeLinecap="round" />
      <path d={d} fill="none" stroke={`url(#${id}-groove)`} strokeWidth={w} strokeLinecap="round" />
    </g>
  )
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e2418" />
          <stop offset="1" stopColor="#355a2a" />
        </linearGradient>
        <linearGradient id={`${id}-earth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e3a20" />
          <stop offset="0.06" stopColor="#d9772f" />
          <stop offset="0.6" stopColor="#bf5a22" />
          <stop offset="1" stopColor="#7c3313" />
        </linearGradient>
        <linearGradient id={`${id}-groove`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c99257" />
          <stop offset="1" stopColor="#f5d09a" />
        </linearGradient>
        <radialGradient id={`${id}-room`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fff0c9" />
          <stop offset="1" stopColor="#e9a35c" />
        </radialGradient>
      </defs>

      <rect width="1600" height="260" fill={`url(#${id}-sky)`} />
      {/* rừng */}
      <path
        d="M0 250 L0 170 Q40 120 80 170 Q110 110 150 160 Q190 100 240 165 Q290 120 330 170 Q380 95 430 160 Q470 120 520 168 Q570 105 620 160 Q660 125 710 170 Q760 100 810 162 Q850 120 900 168 Q950 110 1000 160 Q1050 120 1100 170 Q1150 100 1200 162 Q1250 120 1300 168 Q1350 110 1400 160 Q1450 125 1500 170 Q1550 120 1600 165 L1600 250 Z"
        fill="#1d3a22"
      />
      <path
        d="M0 252 L0 205 Q60 170 120 210 Q200 180 260 212 Q340 175 420 210 Q520 178 600 212 Q700 172 780 210 Q880 180 960 212 Q1060 175 1140 210 Q1240 180 1320 212 Q1420 175 1500 210 Q1560 190 1600 205 L1600 252 Z"
        fill="#2c5228"
      />
      <rect y="246" width="1600" height="900" fill={`url(#${id}-earth)`} />
      <rect y="244" width="1600" height="12" fill="#4f7a2e" />
      {[330, 480, 650, 720, 860].map((y, i) => (
        <path key={y} d={`M0 ${y} Q400 ${y - 14 + i * 4} 800 ${y + 6} T1600 ${y - 4}`} fill="none" stroke="rgba(110,35,8,0.22)" strokeWidth={3 + (i % 3) * 3} />
      ))}

      {/* lỗ thông hơi + ụ mối */}
      <path d="M560 398 L590 252" stroke="#4a1b08" strokeWidth="14" strokeLinecap="round" />
      <path d="M560 398 L590 252" stroke="#9a6438" strokeWidth="6" strokeLinecap="round" />
      <path d="M570 252 L590 212 L612 252 Z" fill="#9a6a3a" />

      {[L1, L2, L3].map((d) => tunnel(d))}
      {LINKS.map((d) => tunnel(d, 30))}

      {/* hầm phòng — tập trung ở cột giữa để không bị thẻ nội dung che */}
      <Room x={430} y={316} w={160} h={86} glow={`${id}-room`}>
        <path d="M452 372 q32 18 64 0" stroke="#6f7d4f" strokeWidth="9" fill="none" />
        <Person x={545} y={392} s={0.85} />
      </Room>
      <Room x={900} y={314} w={180} h={88} glow={`${id}-room`}>
        <path d="M925 368 q36 20 72 0" stroke="#6f7d4f" strokeWidth="9" fill="none" />
        <path d="M985 352 q36 20 72 0" stroke="#6f7d4f" strokeWidth="9" fill="none" />
        <Person x={960} y={392} s={0.85} />
      </Room>
      <Room x={900} y={498} w={220} h={100} glow={`${id}-room`}>
        <rect x={920} y={560} width="86" height="10" rx="3" fill="#7a5530" />
        <rect x={926} y={546} width="66" height="14" rx="6" fill="#8f9a73" />
        <Person x={1030} y={588} s={0.9} c="#f1efe8" />
        <circle cx="1010" cy="514" r="7" fill="#fff3b0">
          <animate attributeName="opacity" values="1;0.55;1" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <Person x={1090} y={588} s={0.9} />
      </Room>
      <Room x={1250} y={498} w={170} h={96} glow={`${id}-room`}>
        <circle cx="1300" cy="564" r="16" fill="#ff7a2a" opacity="0.9">
          <animate attributeName="r" values="14;18;14" dur="0.9s" repeatCount="indefinite" />
        </circle>
        <Person x={1360} y={584} s={0.9} c="#1d1d22" />
      </Room>
      <Room x={900} y={702} w={220} h={98} glow={`${id}-room`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={922 + (i % 3) * 56} y={760 - Math.floor(i / 3) * 30} width="48" height="28" rx="4" fill={i % 2 ? '#55613f' : '#6d4a28'} />
        ))}
        <Person x={1092} y={790} s={0.85} />
      </Room>

      {/* người bò trong hầm tầng 1 */}
      <g>
        <ellipse rx="26" ry="9" fill="#2f4a24" />
        <circle cx="28" cy="-2" r="8" fill="#d9a27a" />
        <animateMotion dur="14s" repeatCount="indefinite" rotate="auto" path={L1} keyPoints="0.3;0.62;0.3" keyTimes="0;0.5;1" calcMode="linear" />
      </g>

      {/* nhãn độ sâu */}
      {[
        { y: 400, t: 'Tầng 1 · ~3 m' },
        { y: 592, t: 'Tầng 2 · ~6 m' },
        { y: 792, t: 'Tầng 3 · 8–10 m' },
      ].map(({ y, t }) => (
        <g key={t} transform={`translate(632 ${y - 68})`}>
          <rect x="0" y="0" width="240" height="46" rx="23" fill="rgba(15,10,6,0.82)" stroke="#fbbf24" strokeOpacity="0.7" />
          <circle cx="24" cy="23" r="6" fill="#fbbf24" />
          <text x="40" y="31" fill="#fff4e0" fontSize="24" fontWeight="700" fontFamily="'Be Vietnam Pro', system-ui, sans-serif">
            {t}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  B-52 rải thảm                                                      */
/* ------------------------------------------------------------------ */

function Plane({ y, delay, dur, scale }: { y: number; delay: number; dur: number; scale: number }) {
  return (
    <g>
      <g transform={`translate(0 ${y}) scale(${scale})`}>
        <g fill="#232a3d" stroke="#8a93b0" strokeOpacity="0.55" strokeWidth="1.5">
          <path d="M0 0 L150 -3 L170 4 L150 10 L0 8 Z" />
          <path d="M60 3 L110 3 L72 -52 L58 -52 Z" />
          <path d="M60 6 L110 6 L72 62 L58 62 Z" />
          <path d="M2 4 L22 4 L8 -26 L0 -26 Z" />
        </g>
        <path d="M0 4 L-260 4" stroke="#cbd5e1" strokeOpacity="0.18" strokeWidth="5" strokeLinecap="round" />
      </g>
      <animateTransform attributeName="transform" type="translate" from="-320 0" to="1900 0" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
    </g>
  )
}

function BombingArt() {
  const id = useSvgId()
  const bombs = Array.from({ length: 14 }, (_, i) => ({ x: 380 + ((i * 97) % 820), d: 1.4 + (i % 4) * 0.25, b: (i * 0.37) % 2.4 }))
  const blasts = [
    { x: 560, b: 0.2 },
    { x: 760, b: 1.1 },
    { x: 980, b: 0.6 },
    { x: 1180, b: 1.7 },
    { x: 420, b: 2.1 },
  ]
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1226" />
          <stop offset="0.5" stopColor="#2a1d36" />
          <stop offset="0.7" stopColor="#8a3a18" />
          <stop offset="1" stopColor="#2a140a" />
        </linearGradient>
        <radialGradient id={`${id}-blast`}>
          <stop offset="0" stopColor="#fff2c2" />
          <stop offset="0.35" stopColor="#ffab40" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-smoke`}>
          <stop offset="0" stopColor="#4a3c38" stopOpacity="0.7" />
          <stop offset="1" stopColor="#4a3c38" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 211) % 1600} cy={(i * 97) % 320} r={i % 5 === 0 ? 2 : 1.2} fill="#cbd5e1" opacity={0.25 + (i % 4) * 0.12} />
      ))}

      <circle cx="760" cy="120" r="46" fill="#ece6d2" opacity="0.85" />
      <circle cx="760" cy="120" r="110" fill="#ece6d2" opacity="0.07" />
      {/* ánh lửa chân trời */}
      {[300, 620, 900, 1200].map((x, i) => (
        <ellipse key={x} cx={x} cy="640" rx="230" ry="60" fill="#ff7a2a" opacity="0.28">
          <animate attributeName="opacity" values="0.2;0.38;0.24;0.2" dur={`${2.2 + i * 0.4}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
      <Plane y={150} delay={-11} dur={24} scale={1.15} />
      <Plane y={230} delay={-6} dur={24} scale={0.9} />
      <Plane y={110} delay={-19} dur={28} scale={0.7} />

      {bombs.map((b, i) => (
        <ellipse key={i} cx={b.x} cy="220" rx="4" ry="14" fill="#e7e5e4">
          <animate attributeName="cy" values="220;650" dur={`${b.d}s`} begin={`${b.b - 3}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur={`${b.d}s`} begin={`${b.b - 3}s`} repeatCount="indefinite" />
        </ellipse>
      ))}

      {/* khói */}
      {[480, 700, 920, 1140].map((x, i) => (
        <ellipse key={x} cx={x} cy={560 - (i % 2) * 30} rx="190" ry="90" fill={`url(#${id}-smoke)`}>
          <animate attributeName="cy" values={`${580 - (i % 2) * 30};${520 - (i % 2) * 30};${580 - (i % 2) * 30}`} dur={`${9 + i}s`} repeatCount="indefinite" />
        </ellipse>
      ))}

      {blasts.map((b) => (
        <circle key={b.x} cx={b.x} cy="650" r="0" fill={`url(#${id}-blast)`}>
          <animate attributeName="r" values="0;170;0" dur="2.4s" begin={`${b.b - 2.4}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* mặt đất cháy sém */}
      <path d="M0 650 Q200 630 400 652 T800 648 T1200 655 T1600 645 L1600 900 L0 900 Z" fill="#20140d" />
      {[260, 520, 690, 880, 1060, 1290, 1450].map((x, i) => (
        <ellipse key={x} cx={x} cy={700 + (i % 3) * 40} rx={60 + (i % 3) * 20} ry={12 + (i % 2) * 6} fill="#0f0906" opacity="0.85" />
      ))}
      {[180, 340, 610, 1010, 1240, 1400].map((x, i) => (
        <g key={x} stroke="#0d0805" strokeLinecap="round" fill="none">
          <path d={`M${x} 655 L${x + (i % 2 ? 8 : -6)} ${560 - (i % 3) * 30}`} strokeWidth="10" />
          <path d={`M${x + 2} ${610 - (i % 3) * 10} L${x + 34} ${580 - (i % 3) * 10}`} strokeWidth="5" />
          <path d={`M${x} ${590 - (i % 3) * 12} L${x - 30} ${566 - (i % 3) * 12}`} strokeWidth="5" />
        </g>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Ngày toàn thắng                                                    */
/* ------------------------------------------------------------------ */

function starPoints(cx: number, cy: number, R: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const rad = i % 2 === 0 ? R : r
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    return `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`
  }).join(' ')
}

function VictoryArt() {
  const id = useSvgId()
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a3412" />
          <stop offset="0.45" stopColor="#f97316" />
          <stop offset="0.7" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor="#fffbea" />
          <stop offset="0.5" stopColor="#fff1b8" />
          <stop offset="1" stopColor="#ffd166" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-flag`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c81e1e" />
          <stop offset="0.5" stopColor="#e3342f" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />

      {/* tia nắng */}
      <g className="tp-anim" style={{ transformOrigin: '800px 560px', animation: 'tp-spin 90s linear infinite' }} opacity="0.35">
        {Array.from({ length: 18 }, (_, i) => (
          <path key={i} d="M800 560 L790 -400 L810 -400 Z" fill="#fff7d6" transform={`rotate(${i * 20} 800 560)`} />
        ))}
      </g>
      <circle cx="800" cy="560" r="260" fill={`url(#${id}-sun)`} />
      <circle cx="800" cy="560" r="110" fill="#fff6d5" />

      {/* chim bay */}
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d="M0 0 q12 -10 24 0 q12 -10 24 0" stroke="#5a1f0a" strokeWidth="4" fill="none">
          <animateTransform attributeName="transform" type="translate" values={`${300 + i * 60} ${240 + i * 26}; ${1300 + i * 40} ${180 + i * 20}`} dur={`${18 + i * 3}s`} repeatCount="indefinite" />
        </path>
      ))}

      {/* đồi & rừng */}
      <path d="M0 640 Q200 560 420 610 T860 590 T1260 600 T1600 580 L1600 900 L0 900 Z" fill="#c2410c" opacity="0.55" />
      <path d="M0 690 Q260 640 520 680 T1040 662 T1600 676 L1600 900 L0 900 Z" fill="#7c2d12" />
      {[90, 210, 380, 1230, 1370, 1500].map((x, i) => (
        <g key={x} fill="#3a1606">
          <rect x={x - 5} y={560 + (i % 2) * 30} width="10" height={140 - (i % 2) * 30} />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx={x} cy={560 + (i % 2) * 30} rx="60" ry="12" transform={`rotate(${a + 15} ${x} ${560 + (i % 2) * 30}) translate(40 0)`} />
          ))}
        </g>
      ))}
      <path d="M0 760 Q400 730 800 752 T1600 745 L1600 900 L0 900 Z" fill="#2a1208" />

      {/* miệng hầm + người bước ra */}
      <ellipse cx="760" cy="770" rx="70" ry="20" fill="#0d0604" />
      <rect x="650" y="740" width="90" height="12" rx="4" fill="#4a2a14" transform="rotate(-24 650 752)" />
      {[
        { x: 735, y: 772, s: 1.05, arm: -50 },
        { x: 800, y: 760, s: 1.15, arm: -70 },
        { x: 680, y: 762, s: 0.95, arm: -30 },
      ].map((p) => (
        <g key={p.x} transform={`translate(${p.x} ${p.y}) scale(${p.s})`} fill="#2a1208">
          <circle cx="0" cy="-118" r="16" />
          <path d="M-20 -100 L20 -100 L26 -40 L-26 -40 Z" />
          <path d="M-18 -42 L-4 -42 L-6 0 L-18 0 Z M4 -42 L18 -42 L18 0 L6 0 Z" />
          <path d={`M18 -96 L${60} ${-96 + p.arm}`} stroke="#2a1208" strokeWidth="10" strokeLinecap="round" />
          <path d="M-18 -96 L-40 -60" stroke="#2a1208" strokeWidth="10" strokeLinecap="round" />
        </g>
      ))}

      {/* cờ */}
      <rect x="926" y="340" width="10" height="440" rx="4" fill="#3b1a0a" />
      <g className="tp-anim" style={{ transformOrigin: '936px 430px', animation: 'tp-flag 2.6s ease-in-out infinite' }}>
        <path d="M936 345 Q1030 325 1120 352 T1300 345 L1300 520 Q1210 500 1120 525 T936 515 Z" fill={`url(#${id}-flag)`} />
        <polygon points={starPoints(1118, 432, 52, 21)} fill="#ffde00" />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Tưởng niệm                                                         */
/* ------------------------------------------------------------------ */

function MemorialArt() {
  const id = useSvgId()
  const rows = [
    { y: 590, n: 13, s: 0.55, spread: 760 },
    { y: 680, n: 10, s: 0.75, spread: 900 },
    { y: 800, n: 7, s: 1.05, spread: 1040 },
  ]
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070a12" />
          <stop offset="0.6" stopColor="#1a1320" />
          <stop offset="1" stopColor="#2a1810" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.75" r="0.55">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.38" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-flame`}>
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.45" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      <rect width="1600" height="900" fill={`url(#${id}-halo)`} />

      {/* tháp tưởng niệm (bóng) */}
      <g fill="#14121c" stroke="#4a3a2a" strokeOpacity="0.5" strokeWidth="2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const w = 230 - i * 20
          const y = 520 - i * 42
          return (
            <g key={i}>
              <rect x={800 - w / 2 + 14} y={y - 30} width={w - 28} height="30" />
              <path d={`M${800 - w / 2 - 18} ${y - 26} Q800 ${y - 44} ${800 + w / 2 + 18} ${y - 26} L${800 + w / 2} ${y - 16} L${800 - w / 2} ${y - 16} Z`} />
            </g>
          )
        })}
        <rect x="794" y="110" width="12" height="40" />
      </g>

      {/* nến */}
      {rows.map((row, ri) =>
        Array.from({ length: row.n }, (_, i) => {
          const x = 800 - row.spread / 2 + (i * row.spread) / (row.n - 1)
          const dur = 1.1 + ((i * 7 + ri * 3) % 9) / 10
          return (
            <g key={`${ri}-${i}`} transform={`translate(${x} ${row.y}) scale(${row.s})`}>
              <circle cx="0" cy="-70" r="46" fill={`url(#${id}-flame)`} opacity="0.35">
                <animate attributeName="opacity" values="0.25;0.45;0.3;0.25" dur={`${dur}s`} repeatCount="indefinite" />
              </circle>
              <rect x="-11" y="-50" width="22" height="58" rx="4" fill="#efe2c6" />
              <ellipse cx="0" cy="-66" rx="8" ry="18" fill={`url(#${id}-flame)`}>
                <animate attributeName="ry" values="17;21;16;17" dur={`${dur}s`} repeatCount="indefinite" />
              </ellipse>
            </g>
          )
        }),
      )}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Đền tưởng niệm (ban ngày)                                          */
/* ------------------------------------------------------------------ */

function TempleArt() {
  const id = useSvgId()
  const tiers = Array.from({ length: 9 }, (_, i) => i)
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb2d6" />
          <stop offset="0.55" stopColor="#d9e6ea" />
          <stop offset="1" stopColor="#f3e3c2" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.62" cy="0.18" r="0.5">
          <stop offset="0" stopColor="#fff8e1" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff8e1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-stone`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d7f6a" />
          <stop offset="0.45" stopColor="#c9b894" />
          <stop offset="1" stopColor="#7a6c58" />
        </linearGradient>
        <linearGradient id={`${id}-roof`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a3b22" />
          <stop offset="1" stopColor="#6e2614" />
        </linearGradient>
        <radialGradient id={`${id}-smoke`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <rect width="1600" height="900" fill={`url(#${id}-sun)`} />

      {/* cây hai bên */}
      {[60, 190, 300, 1300, 1420, 1540].map((x, i) => (
        <g key={x} fill={i % 2 ? '#2f5a2c' : '#3c6b34'}>
          <rect x={x - 7} y={430 + (i % 3) * 20} width="14" height="260" fill="#4a3826" />
          <ellipse cx={x} cy={420 + (i % 3) * 20} rx={95 - (i % 2) * 15} ry={120} />
          <ellipse cx={x - 50} cy={490 + (i % 3) * 20} rx="70" ry="80" />
          <ellipse cx={x + 55} cy={480 + (i % 3) * 20} rx="70" ry="85" />
        </g>
      ))}

      {/* tháp tưởng niệm 9 tầng */}
      <g>
        {tiers.map((i) => {
          const w = 210 - i * 18
          const y = 560 - i * 44
          return (
            <g key={i}>
              <rect x={800 - w / 2 + 16} y={y - 34} width={w - 32} height="34" fill={`url(#${id}-stone)`} />
              <rect x={800 - 10} y={y - 28} width="20" height="22" rx="10" fill="#4a3b2a" opacity="0.7" />
              <path
                d={`M${800 - w / 2 - 22} ${y - 28} Q${800 - w / 2} ${y - 36} ${800 - w / 4} ${y - 40} L${800 + w / 4} ${y - 40} Q${800 + w / 2} ${y - 36} ${800 + w / 2 + 22} ${y - 28} L${800 + w / 2} ${y - 22} L${800 - w / 2} ${y - 22} Z`}
                fill="#5e4a35"
              />
            </g>
          )
        })}
        <path d="M800 116 L812 150 L788 150 Z" fill="#c9a24a" />
      </g>

      {/* mái đền */}
      <g>
        <rect x="560" y="610" width="480" height="110" fill="#e9cf8e" />
        {[600, 680, 760, 840, 920, 1000].map((x) => (
          <rect key={x} x={x - 9} y="618" width="18" height="102" fill="#8a2f1c" />
        ))}
        <rect x="770" y="640" width="60" height="80" fill="#5a1f12" />
        <path d="M500 618 Q560 600 600 572 L1000 572 Q1040 600 1100 618 L1080 628 L520 628 Z" fill={`url(#${id}-roof)`} />
        <path d="M486 606 Q510 618 530 612" stroke="#6e2614" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M1114 606 Q1090 618 1070 612" stroke="#6e2614" strokeWidth="10" fill="none" strokeLinecap="round" />
        <rect x="600" y="560" width="400" height="14" rx="6" fill="#7d2a18" />
        <circle cx="800" cy="552" r="12" fill="#d4a943" />
      </g>

      {/* sân & bậc */}
      <path d="M0 720 L1600 720 L1600 900 L0 900 Z" fill="#d8ccb3" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={540 - i * 30} y={720 + i * 16} width={520 + i * 60} height="16" fill={i % 2 ? '#c8bb9f' : '#e3d8c2'} />
      ))}
      <path d="M0 780 Q800 760 1600 780" stroke="#c2b498" strokeWidth="3" fill="none" />

      {/* lư hương + khói */}
      <g>
        <path d="M740 800 Q800 850 860 800 Z" fill="#8a6a2e" />
        <rect x="730" y="790" width="140" height="14" rx="7" fill="#a5823b" />
        {[770, 790, 810, 830].map((x) => (
          <line key={x} x1={x} y1="790" x2={x + (x - 800) * 0.15} y2="736" stroke="#7a2a18" strokeWidth="3" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx="800" cy="730" rx="34" ry="22" fill={`url(#${id}-smoke)`}>
            <animate attributeName="cy" values="730;520" dur="7s" begin={`${-i * 1.4}s`} repeatCount="indefinite" />
            <animate attributeName="cx" values="800;786;816;798" dur="7s" begin={`${-i * 1.4}s`} repeatCount="indefinite" />
            <animate attributeName="rx" values="16;70" dur="7s" begin={`${-i * 1.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.8;0" dur="7s" begin={`${-i * 1.4}s`} repeatCount="indefinite" />
          </ellipse>
        ))}
      </g>

      {/* chậu cúc vàng */}
      {[620, 980].map((x) => (
        <g key={x}>
          <path d={`M${x - 34} 812 L${x + 34} 812 L${x + 24} 860 L${x - 24} 860 Z`} fill="#6b4a2a" />
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={x - 28 + (i % 5) * 14} cy={800 - Math.floor(i / 5) * 16 - (i % 2) * 4} r="10" fill={i % 3 ? '#f5b625' : '#f08c1a'} />
          ))}
        </g>
      ))}

      {/* chim bay */}
      {[0, 1, 2].map((i) => (
        <path key={i} d="M0 0 q12 -10 24 0 q12 -10 24 0" stroke="#3b4a56" strokeWidth="3.5" fill="none">
          <animateTransform attributeName="transform" type="translate" values={`${-100 - i * 80} ${200 + i * 30}; ${1700} ${150 + i * 25}`} dur={`${26 + i * 4}s`} begin={`${-i * 7}s`} repeatCount="indefinite" />
        </path>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  1948 — hai xã, hai đoạn hầm riêng, chưa liên thông                 */
/* ------------------------------------------------------------------ */

function Hut({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-46" y="-40" width="92" height="40" fill="#b08a52" />
      <path d="M-62 -38 L0 -86 L62 -38 Z" fill="#7d6539" />
      <rect x="-10" y="-26" width="20" height="26" fill="#3e2f1d" />
    </g>
  )
}

function Bamboo({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#6f8f3a" strokeWidth="5" strokeLinecap="round">
      {[-14, -4, 6, 16].map((dx, i) => (
        <g key={dx}>
          <path d={`M${x + dx} ${y} L${x + dx * 1.6} ${y - 120 - i * 14}`} />
          <ellipse cx={x + dx * 1.6} cy={y - 120 - i * 14} rx="22" ry="9" fill="#4f9140" stroke="none" />
        </g>
      ))}
    </g>
  )
}

function VillagesArt() {
  const id = useSvgId()
  const tunnelA = 'M560 312 C 556 360, 572 392, 610 404 L 760 410'
  const tunnelB = 'M960 312 C 964 362, 948 396, 908 412 L 1040 418'
  const groove = (d: string) => (
    <g key={d}>
      <path d={d} fill="none" stroke="#4a1b08" strokeWidth="46" strokeLinecap="round" />
      <path d={d} fill="none" stroke={`url(#${id}-groove)`} strokeWidth="32" strokeLinecap="round" />
    </g>
  )
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14301f" />
          <stop offset="1" stopColor="#3f6a2f" />
        </linearGradient>
        <linearGradient id={`${id}-earth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e3a20" />
          <stop offset="0.07" stopColor="#d9772f" />
          <stop offset="1" stopColor="#9a3f17" />
        </linearGradient>
        <linearGradient id={`${id}-groove`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c99257" />
          <stop offset="1" stopColor="#f5d09a" />
        </linearGradient>
        <radialGradient id={`${id}-room`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fff0c9" />
          <stop offset="1" stopColor="#e9a35c" />
        </radialGradient>
      </defs>
      <rect width="1600" height="320" fill={`url(#${id}-sky)`} />
      <path
        d="M0 310 L0 220 Q60 170 120 215 Q180 160 250 212 Q330 170 400 214 Q1200 190 1600 214 L1600 310 Z"
        fill="#24452a"
        opacity="0.6"
      />
      <rect y="306" width="1600" height="600" fill={`url(#${id}-earth)`} />
      <rect y="302" width="1600" height="12" fill="#4f7a2e" />
      {[420, 520, 640, 760].map((y, i) => (
        <path key={y} d={`M0 ${y} Q400 ${y - 10 + i * 3} 800 ${y + 6} T1600 ${y - 4}`} fill="none" stroke="rgba(110,35,8,0.2)" strokeWidth={3 + (i % 3) * 3} />
      ))}

      {/* Làng Tân Phú Trung */}
      <Bamboo x={470} y={306} />
      <Hut x={640} y={306} s={1.05} />
      <Bamboo x={720} y={306} />
      {/* Làng Phước Vĩnh An */}
      <Bamboo x={870} y={306} />
      <Hut x={1020} y={306} s={0.95} />
      <Bamboo x={1130} y={306} />

      {groove(tunnelA)}
      {groove(tunnelB)}
      {/* hầm ẩn nấp ở cuối mỗi đoạn */}
      {[
        { x: 742, y: 366 },
        { x: 1022, y: 374 },
      ].map((r) => (
        <g key={r.x}>
          <rect x={r.x - 6} y={r.y - 6} width="112" height="78" rx="26" fill="#4a1b08" />
          <rect x={r.x} y={r.y} width="100" height="66" rx="22" fill={`url(#${id}-room)`} />
          <circle cx={r.x + 50} cy={r.y + 26} r="9" fill="#d9a27a" />
          <path d={`M${r.x + 38} ${r.y + 36} h24 l4 26 h-32 z`} fill="#2f4a24" />
        </g>
      ))}
      {/* miệng hầm */}
      {[560, 960].map((x) => (
        <rect key={x} x={x - 26} y="298" width="52" height="10" rx="3" fill="#6b5a34" />
      ))}

      {/* chưa liên thông */}
      <path d="M856 430 L 916 430" stroke="rgba(255,240,210,0.9)" strokeWidth="4" strokeDasharray="10 8" />
      <path d="M874 418 l24 24 M898 418 l-24 24" stroke="#fecaca" strokeWidth="6" strokeLinecap="round" />

      {[
        { x: 560, t: 'Tân Phú Trung' },
        { x: 960, t: 'Phước Vĩnh An' },
      ].map(({ x, t }) => (
        <g key={t} transform={`translate(${x - 110} 520)`}>
          <rect width="220" height="46" rx="23" fill="rgba(15,10,6,0.82)" stroke="#f87171" strokeOpacity="0.7" />
          <circle cx="24" cy="23" r="6" fill="#f87171" />
          <text x="40" y="31" fill="#fff4e0" fontSize="23" fontWeight="700" fontFamily="'Be Vietnam Pro', system-ui, sans-serif">
            {t}
          </text>
        </g>
      ))}
      <g transform="translate(770 600)">
        <rect width="230" height="40" rx="20" fill="rgba(15,10,6,0.7)" />
        <text x="115" y="27" textAnchor="middle" fill="#fecaca" fontSize="20" fontWeight="600" fontFamily="'Be Vietnam Pro', system-ui, sans-serif">
          Chưa liên thông
        </text>
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  2025 — địa đạo lên màn ảnh rộng                                    */
/* ------------------------------------------------------------------ */

function CinemaArt() {
  const id = useSvgId()
  return (
    <svg {...SVG_PROPS}>
      <defs>
        <linearGradient id={`${id}-room`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0b12" />
          <stop offset="1" stopColor="#1a1018" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff6dc" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`${id}-earth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c45f24" />
          <stop offset="1" stopColor="#7a2e10" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#ffb469" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffb469" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-screen`}>
          <rect x="500" y="120" width="600" height="320" rx="6" />
        </clipPath>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-room)`} />
      <ellipse cx="800" cy="280" rx="560" ry="300" fill={`url(#${id}-glow)`} />

      {/* rèm hai bên */}
      {[0, 1].map((side) => (
        <path
          key={side}
          d={side ? 'M1140 80 Q1170 300 1150 520 L1240 520 L1240 80 Z' : 'M460 80 Q430 300 450 520 L360 520 L360 80 Z'}
          fill="#5a1418"
        />
      ))}

      {/* màn hình: cảnh lát cắt địa đạo */}
      <g clipPath={`url(#${id}-screen)`}>
        <rect x="500" y="120" width="600" height="320" fill="#1d3a2a" />
        <rect x="500" y="230" width="600" height="210" fill={`url(#${id}-earth)`} />
        <rect x="500" y="226" width="600" height="8" fill="#4f7a2e" />
        {[530, 590, 660, 1010, 1070].map((x, i) => (
          <g key={x} fill="#173a1f">
            <rect x={x - 3} y={170 + (i % 2) * 10} width="6" height="60" fill="#3a2a1a" />
            <ellipse cx={x} cy={165 + (i % 2) * 10} rx="26" ry="30" />
          </g>
        ))}
        <path d="M560 240 C 556 290, 600 320, 660 326 L 960 330 C 1010 332, 1040 300, 1046 240" fill="none" stroke="#4a1b08" strokeWidth="34" strokeLinecap="round" />
        <path d="M560 240 C 556 290, 600 320, 660 326 L 960 330 C 1010 332, 1040 300, 1046 240" fill="none" stroke="#efc58e" strokeWidth="22" strokeLinecap="round" />
        <g>
          <ellipse rx="22" ry="7" fill="#2f4a24" />
          <circle cx="22" cy="-2" r="7" fill="#d9a27a" />
          <animateTransform attributeName="transform" type="translate" values="680 326; 940 330; 680 326" dur="12s" repeatCount="indefinite" />
        </g>
        <rect x="500" y="120" width="600" height="320" fill="#ffffff" opacity="0.04">
          <animate attributeName="opacity" values="0.02;0.07;0.03;0.05;0.02" dur="1.6s" repeatCount="indefinite" />
        </rect>
      </g>
      <rect x="496" y="116" width="608" height="328" rx="8" fill="none" stroke="#d8cdb4" strokeOpacity="0.35" strokeWidth="3" />

      {/* chùm sáng máy chiếu */}
      <path d="M790 860 L500 440 L1100 440 L810 860 Z" fill={`url(#${id}-beam)`} />
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={720 + ((i * 53) % 160)} cy={820} r={1.6 + (i % 3) * 0.6} fill="#fff6dc" opacity="0.6">
          <animate attributeName="cy" values="820;470" dur={`${6 + (i % 5)}s`} begin={`${-i * 0.7}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.7;0" dur={`${6 + (i % 5)}s`} begin={`${-i * 0.7}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* khán giả */}
      {[
        { y: 640, n: 11, s: 0.85 },
        { y: 730, n: 10, s: 1.0 },
        { y: 830, n: 9, s: 1.18 },
      ].map((row, ri) =>
        Array.from({ length: row.n }, (_, i) => {
          const x = 800 - ((row.n - 1) / 2) * 112 * row.s + i * 112 * row.s + (ri % 2) * 20
          return (
            <g key={`${ri}-${i}`} transform={`translate(${x} ${row.y}) scale(${row.s})`} fill="#07070b">
              <circle cx="0" cy="-58" r="22" />
              <path d="M-40 0 Q-40 -38 0 -38 Q40 -38 40 0 Z" />
            </g>
          )
        }),
      )}
      <rect y="820" width="1600" height="80" fill="#07070b" />
    </svg>
  )
}

export function StoryArt({ art }: { art: ArtKind }) {
  switch (art) {
    case 'villages':
      return <VillagesArt />
    case 'cinema':
      return <CinemaArt />
    case 'temple':
      return <TempleArt />
    case 'layers':
      return <LayersArt />
    case 'bombing':
      return <BombingArt />
    case 'victory':
      return <VictoryArt />
    case 'memorial':
      return <MemorialArt />
  }
}
