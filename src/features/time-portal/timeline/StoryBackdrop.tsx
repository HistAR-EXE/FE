// src/features/time-portal/timeline/StoryBackdrop.tsx
// Nền không khí phía sau nội dung: bản mờ của ảnh tư liệu (ảnh thật hiển thị
// trọn vẹn trong khung ở PhotoStage) hoặc tranh minh hoạ SVG phủ kín,
// chuyển cảnh mờ dần, cùng hạt bụi/đom đóm, film grain, vignette.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { EraStory, StoryVisual } from './storyData'
import { StoryArt } from './StoryArt'

type Layer = { key: string; visual: StoryVisual }

const GRAIN =
  'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")'

function FadeLayer({ children, instant }: { children: ReactNode; instant: boolean }) {
  const [shown, setShown] = useState(instant)
  useEffect(() => {
    if (instant) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [instant])
  return (
    <div className="absolute inset-0 overflow-hidden transition-opacity duration-[900ms] ease-out" style={{ opacity: shown ? 1 : 0 }}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hạt không khí theo thời kỳ                                         */
/* ------------------------------------------------------------------ */

const PARTICLE_STYLE: Record<
  EraStory['particles'],
  { count: number; anim: string; color: string; glow: string; size: [number, number]; dur: [number, number] }
> = {
  fireflies: { count: 16, anim: 'tp-firefly', color: '#fef08a', glow: '0 0 10px 3px rgba(254,240,138,0.65)', size: [3, 5], dur: [6, 11] },
  ash: { count: 22, anim: 'tp-fall', color: 'rgba(225,218,205,0.75)', glow: 'none', size: [2, 4], dur: [9, 17] },
  embers: { count: 18, anim: 'tp-rise', color: '#fcd34d', glow: '0 0 8px 2px rgba(252,211,77,0.6)', size: [2, 4], dur: [8, 15] },
  dust: { count: 14, anim: 'tp-drift', color: 'rgba(255,240,210,0.6)', glow: '0 0 6px 1px rgba(255,240,210,0.35)', size: [2, 3], dur: [10, 18] },
}

function rand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function Particles({ kind }: { kind: EraStory['particles'] }) {
  const p = PARTICLE_STYLE[kind]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: p.count }, (_, i) => {
        const size = p.size[0] + rand(i, 1) * (p.size[1] - p.size[0])
        const dur = p.dur[0] + rand(i, 2) * (p.dur[1] - p.dur[0])
        const top = kind === 'ash' ? -5 : kind === 'embers' ? 100 : 10 + rand(i, 3) * 80
        return (
          <span
            key={i}
            className="tp-particle"
            style={
              {
                left: `${rand(i, 4) * 100}%`,
                top: `${top}%`,
                width: size,
                height: size,
                background: p.color,
                boxShadow: p.glow,
                animation: `${p.anim} ${dur.toFixed(1)}s ${(-rand(i, 5) * dur).toFixed(1)}s infinite ${kind === 'fireflies' ? 'ease-in-out' : 'linear'}`,
                '--dx': `${((rand(i, 6) - 0.5) * 160).toFixed(0)}px`,
                '--dy': `${((rand(i, 7) - 0.5) * 120).toFixed(0)}px`,
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Backdrop                                                           */
/* ------------------------------------------------------------------ */

type Props = {
  story: EraStory
  visual: StoryVisual
  visualKey: string
  durationMs: number
}

export function StoryBackdrop({ story, visual, visualKey, durationMs }: Props) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ key: visualKey, visual }])
  const firstKey = useRef(visualKey)

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1]?.key === visualKey ? prev : [...prev.slice(-1), { key: visualKey, visual }]))
  }, [visualKey, visual])

  useEffect(() => {
    if (layers.length < 2) return
    const t = window.setTimeout(() => setLayers((l) => l.slice(-1)), 1000)
    return () => window.clearTimeout(t)
  }, [layers])

  const isArt = visual.kind === 'art'

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {layers.map((l) => (
        <FadeLayer key={l.key} instant={l.key === firstKey.current}>
          {l.visual.kind === 'photo' ? (
            <img
              src={l.visual.src}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-125 object-cover"
              style={{ filter: `${story.photoFilter} blur(36px) brightness(0.5) saturate(0.9)` }}
            />
          ) : (
            <div className="tp-anim absolute inset-0" style={{ animation: `tp-art-zoom ${durationMs}ms ease-out forwards` }}>
              <StoryArt art={l.visual.art} />
            </div>
          )}
        </FadeLayer>
      ))}

      {/* Lớp đọc chữ: tối trên/dưới, tối hơn ở cột nội dung bên trái */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isArt
            ? 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 28%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.7) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0) 74%, rgba(0,0,0,0.45) 100%)' }}
      />
      {story.era !== 2026 && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN, backgroundSize: '128px 128px' }} />
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
      <Particles kind={story.particles} />
    </div>
  )
}
