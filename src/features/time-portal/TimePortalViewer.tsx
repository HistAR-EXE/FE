// src/features/time-portal/TimePortalViewer.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PhotoPair } from '../locations/api'
import type { PhotoScene } from '../photo-scenes/api'
import { images } from '../../assets/images'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { resolveMediaUrl } from '../../shared/config/env'
import { eraBadgeClass } from '../../shared/ui/eraBadge'
import { CompareLayerImage } from './CompareLayerImage'
import { LampHotspotLayer } from './LampHotspotLayer'
import type { LampHotspot } from './lampHotspots'
import {
  ERA_VALUES,
  eraCompareSideLabel,
  eraHeadline,
  eraTimelineLabel,
  isPresentEra,
  type EraValue,
} from './eraLabels'

type TimePortalViewerProps = {
  scenes?: PhotoScene[]
  pairs?: PhotoPair[]
  sceneIndex: number
  onSceneIndexChange: (index: number) => void
  onEraChange?: (era: EraValue) => void
  onEngagement?: () => void
  initialEra?: EraValue
  isPremium?: boolean
  onPremiumRequired?: () => void
  /** Đèn dầu hotspots (x/y % hoặc yaw/pitch). Hiển thị cả khi không có depth map. */
  lampHotspots?: LampHotspot[]
  onLampActivate?: (hotspot: LampHotspot) => void
  /** Depth map tuỳ chọn (trắng = gần). Thiếu/lỗi → chỉ parallax nền + đèn dầu. */
  depthMapUrl?: string
  /** Bật parallax theo con trỏ. Mặc định true. */
  parallax?: boolean
}

/** Tilt (degrees) that maps to full parallax offset, neutral beta when the phone is held upright, low-pass factor. */
const GYRO_RANGE_DEG = 25
const GYRO_NEUTRAL_BETA_DEG = 50
const GYRO_LOW_PASS_ALPHA = 0.12

type DeviceOrientationWithPermission = {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function hasDeviceOrientation(): boolean {
  return typeof window !== 'undefined' && typeof DeviceOrientationEvent !== 'undefined'
}

function gyroNeedsPermissionApi(): boolean {
  if (!hasDeviceOrientation()) return false
  return typeof (DeviceOrientationEvent as unknown as DeviceOrientationWithPermission).requestPermission === 'function'
}

type LayerData = { imageUrl: string; caption: string; era: EraValue }

function layerForEra(scene: PhotoScene | undefined, era: EraValue, pair: PhotoPair | undefined): LayerData {
  if (scene?.layers?.length) {
    const layer =
      scene.layers.find((l) => l.era === era) ??
      (era !== 1968 ? scene.layers.find((l) => l.era === 1968) : undefined) ??
      scene.layers.find((l) => l.era !== 2026) ??
      scene.layers[0]
    if (layer) {
      return {
        imageUrl: resolveMediaUrl(layer.imageUrl),
        caption: layer.caption,
        era: layer.era as EraValue,
      }
    }
  }
  if (pair) {
    const imageUrl = era === 2026 ? pair.currentImage : pair.historicalImage
    return {
      imageUrl: resolveMediaUrl(imageUrl),
      caption: pair.caption,
      era: (pair.year ?? 1968) as EraValue,
    }
  }
  return {
    imageUrl: era === 2026 ? images.timePortalPresent : images.timePortalPast,
    caption: '',
    era,
  }
}

function resolveCompareLayers(
  scene: PhotoScene | undefined,
  pair: PhotoPair | undefined,
  selectedEra: EraValue,
): { past: LayerData; present: LayerData; compareEra: EraValue } {
  const present = layerForEra(scene, 2026, pair)
  const compareEra: EraValue = isPresentEra(selectedEra) ? 1968 : selectedEra
  const past = layerForEra(scene, compareEra, pair)
  return { past, present, compareEra }
}

export function TimePortalViewer({
  scenes,
  pairs,
  sceneIndex,
  onSceneIndexChange,
  onEraChange,
  onEngagement,
  initialEra,
  isPremium = true,
  onPremiumRequired,
  lampHotspots,
  onLampActivate,
  depthMapUrl,
  parallax = true,
}: TimePortalViewerProps) {
  const scene = scenes?.[sceneIndex]
  const pair = pairs?.[sceneIndex]
  const tabs = scenes?.length ? scenes : pairs ?? []
  const [era, setEra] = useState<EraValue>(initialEra ?? 2026)
  const [sliderPct, setSliderPct] = useState(50)
  const [vortex, setVortex] = useState(false)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { past, present, compareEra } = useMemo(
    () => resolveCompareLayers(scene, pair, era),
    [scene, pair, era],
  )

  const showCompare = !isPresentEra(era)

  const sceneLamps = useMemo(
    () => (lampHotspots ?? []).filter((h) => h.sceneIndex === undefined || h.sceneIndex === sceneIndex),
    [lampHotspots, sceneIndex],
  )

  // Depth map: chỉ dùng khi tải được; lỗi → fallback (đèn dầu + parallax nền vẫn chạy).
  const [depthReady, setDepthReady] = useState(false)
  useEffect(() => {
    setDepthReady(false)
    if (!depthMapUrl) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setDepthReady(true)
    }
    img.onerror = () => {
      if (!cancelled) setDepthReady(false)
    }
    img.src = depthMapUrl
    return () => {
      cancelled = true
    }
  }, [depthMapUrl])

  // Parallax: lerp bằng rAF, ghi CSS variables (không re-render React).
  const parallaxTarget = useRef({ x: 0, y: 0 })
  const parallaxCurrent = useRef({ x: 0, y: 0 })
  const parallaxRaf = useRef<number | null>(null)

  const runParallax = useCallback(() => {
    if (parallaxRaf.current !== null) return
    const step = () => {
      const el = containerRef.current
      const c = parallaxCurrent.current
      const t = parallaxTarget.current
      c.x += (t.x - c.x) * 0.12
      c.y += (t.y - c.y) * 0.12
      if (el) {
        el.style.setProperty('--px', c.x.toFixed(4))
        el.style.setProperty('--py', c.y.toFixed(4))
      }
      if (Math.abs(t.x - c.x) < 0.002 && Math.abs(t.y - c.y) < 0.002) {
        parallaxRaf.current = null
        return
      }
      parallaxRaf.current = requestAnimationFrame(step)
    }
    parallaxRaf.current = requestAnimationFrame(step)
  }, [])

  useEffect(
    () => () => {
      if (parallaxRaf.current !== null) cancelAnimationFrame(parallaxRaf.current)
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!parallax || e.pointerType === 'touch' || dragging.current) return
      const rect = e.currentTarget.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      parallaxTarget.current = {
        x: ((e.clientX - rect.left) / rect.width - 0.5) * -2,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * -2,
      }
      runParallax()
    },
    [parallax, runParallax],
  )

  const onPointerLeave = useCallback(() => {
    parallaxTarget.current = { x: 0, y: 0 }
    runParallax()
  }, [runParallax])

  // Gyro parallax (mobile): DeviceOrientation + low-pass filter. iOS 13+ needs a user-gesture permission request.
  // Pointer parallax above stays as the fallback (desktop / permission denied / no sensor).
  // iOS exposes requestPermission (must be called from a tap -> button); other browsers just start listening.
  const [gyroEnabled, setGyroEnabled] = useState(() => hasDeviceOrientation() && !gyroNeedsPermissionApi())
  const [gyroNeedsPermission, setGyroNeedsPermission] = useState(
    () => hasDeviceOrientation() && gyroNeedsPermissionApi(),
  )
  const gyroSmoothed = useRef({ x: 0, y: 0 })

  const onDeviceOrientation = useCallback(
    (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      const clamp = (v: number) => Math.min(1, Math.max(-1, v))
      const rawX = clamp(e.gamma / GYRO_RANGE_DEG)
      const rawY = clamp((e.beta - GYRO_NEUTRAL_BETA_DEG) / GYRO_RANGE_DEG)
      const s = gyroSmoothed.current
      s.x += (rawX - s.x) * GYRO_LOW_PASS_ALPHA
      s.y += (rawY - s.y) * GYRO_LOW_PASS_ALPHA
      parallaxTarget.current = { x: -s.x, y: -s.y }
      runParallax()
    },
    [runParallax],
  )

  useEffect(() => {
    if (!parallax || !gyroEnabled) return
    window.addEventListener('deviceorientation', onDeviceOrientation)
    return () => window.removeEventListener('deviceorientation', onDeviceOrientation)
  }, [parallax, gyroEnabled, onDeviceOrientation])

  const requestGyroPermission = useCallback(async () => {
    const requestPermission = (DeviceOrientationEvent as unknown as DeviceOrientationWithPermission)
      .requestPermission
    if (typeof requestPermission !== 'function') return
    try {
      const result = await requestPermission.call(DeviceOrientationEvent)
      if (result === 'granted') {
        setGyroEnabled(true)
        setGyroNeedsPermission(false)
      } else {
        setGyroNeedsPermission(false) // denied: keep the pointer fallback
      }
    } catch {
      setGyroNeedsPermission(false)
    }
  }, [])

  useEffect(() => {
    if (initialEra) setEra(initialEra)
  }, [initialEra])

  const defaultEra: EraValue = 2026

  const triggerVortex = useCallback(
    (nextEra: EraValue) => {
      if (!isPremium && nextEra !== defaultEra) {
        onPremiumRequired?.()
        return
      }
      setVortex(true)
      setEra(nextEra)
      if (!isPresentEra(nextEra)) setSliderPct(50)
      onEngagement?.()
      onEraChange?.(nextEra)
      window.setTimeout(() => setVortex(false), 1400)
    },
    [onEraChange, onEngagement, isPremium, onPremiumRequired],
  )

  useEffect(() => {
    const onMove = (clientX: number) => {
      const el = containerRef.current
      if (!el || !dragging.current) return
      const rect = el.getBoundingClientRect()
      const pct = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100))
      setSliderPct(pct)
    }
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX)
    }
    const stop = () => {
      dragging.current = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', stop)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', stop)
    }
  }, [])

  if (!tabs.length) return null

  const caption = isPresentEra(era) ? present.caption : past.caption || present.caption

  return (
    <div
      ref={containerRef}
      className="portal-parallax relative h-full w-full overflow-hidden bg-black"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {vortex && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center" aria-hidden>
          <div
            className="w-[120%] h-[120%] rounded-full opacity-70 animate-spin"
            style={{
              background: 'conic-gradient(from 0deg, transparent, #3B82F6, #5EEAD4, transparent)',
              animationDuration: '1.4s',
            }}
          />
        </div>
      )}

      {/* Hiện trạng — luôn là lớp nền (bên phải khi so sánh) */}
      <CompareLayerImage
        src={present.imageUrl}
        fallback={images.timePortalPresent}
        alt="Hiện nay"
        className={`absolute inset-0 w-full h-full object-cover${parallax ? ' portal-parallax-layer' : ''}`}
        style={{ '--depth': 6 } as React.CSSProperties}
      />

      {/* Lớp tiền cảnh 2.5D: cùng ảnh, mask bằng depth map, dịch chuyển mạnh hơn */}
      {parallax && depthReady && depthMapUrl && (
        <CompareLayerImage
          src={present.imageUrl}
          fallback={images.timePortalPresent}
          alt=""
          className="portal-depth-fg portal-parallax-layer absolute inset-0 z-[5] w-full h-full object-cover pointer-events-none"
          style={{ '--depth': 16, '--depth-map': `url("${depthMapUrl}")` } as React.CSSProperties}
        />
      )}

      {/* Ảnh xưa — lớp trên, cắt theo thanh trượt (bên trái) */}
      {showCompare && (
        <div
          className="absolute inset-0 z-10 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}
        >
          <CompareLayerImage
            src={past.imageUrl}
            fallback={images.timePortalPast}
            alt={`Tái hiện ${compareEra}`}
            className={`absolute inset-0 w-full h-full object-cover brightness-90${parallax ? ' portal-parallax-layer' : ''}`}
            style={{ '--depth': 6 } as React.CSSProperties}
          />
        </div>
      )}

      {/* Đèn dầu — bám theo lớp nền (cùng hệ số parallax), không phụ thuộc depth map */}
      {sceneLamps.length > 0 && (
        <div
          className={`absolute inset-0 z-[15] pointer-events-none${parallax ? ' portal-parallax-layer' : ''}`}
          style={{ '--depth': 6 } as React.CSSProperties}
        >
          <LampHotspotLayer
            hotspots={sceneLamps}
            onActivate={(h) => {
              onEngagement?.()
              onLampActivate?.(h)
            }}
          />
        </div>
      )}

      <div className="absolute top-xl left-xl z-20 max-w-md pointer-events-none">
        {showCompare ? (
          <>
            <p className="text-primary text-sm font-label-sm mb-1">{eraCompareSideLabel(compareEra)}</p>
            {caption && <p className="text-on-surface-variant text-sm">{caption}</p>}
          </>
        ) : (
          <>
            <h2 className="font-display-lg text-primary">{eraHeadline(era)}</h2>
            {caption && <p className="text-on-surface-variant text-sm mt-1">{caption}</p>}
          </>
        )}
      </div>

      {showCompare && (
        <>
          <div className="absolute top-xl right-xl z-20 px-3 py-1 rounded-full bg-black/50 border border-secondary/40 text-xs text-secondary backdrop-blur-sm pointer-events-none">
            Hiện nay
          </div>
          <div
            className="slider-handle"
            style={{ left: `${sliderPct}%` }}
            onMouseDown={() => {
              dragging.current = true
              onEngagement?.()
            }}
            onTouchStart={() => {
              dragging.current = true
              onEngagement?.()
            }}
            role="slider"
            aria-valuenow={sliderPct}
            aria-label="So sánh xưa và nay"
          >
            <div className="slider-button">
              <MaterialIcon name="compare_arrows" className="text-primary text-xl" />
            </div>
          </div>
        </>
      )}

      {gyroNeedsPermission && (
        <button
          type="button"
          data-testid="gyro-permission-btn"
          onClick={() => void requestGyroPermission()}
          className="absolute top-24 right-xl z-30 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 border border-secondary/50 text-xs text-secondary backdrop-blur-sm"
        >
          <MaterialIcon name="screen_rotation" className="text-sm" />
          Bật cảm biến nghiêng
        </button>
      )}

      <div className="absolute bottom-xl left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-sm">
        <div className="bg-surface/70 backdrop-blur-xl border border-outline-variant/50 rounded-full px-lg py-sm flex gap-lg">
          {ERA_VALUES.map((e) => {
            const locked = !isPremium && e !== defaultEra
            return (
            <button
              key={e}
              type="button"
              onClick={() => triggerVortex(e)}
              className={`font-title-md inline-flex items-center gap-1.5 px-sm py-xs rounded-full border transition-colors ${
                e === era
                  ? eraBadgeClass(e)
                  : 'text-on-surface-variant hover:text-on-surface border-transparent'
              } ${locked ? 'opacity-70' : ''}`}
            >
              {locked && <MaterialIcon name="lock" className="text-sm text-on-surface-variant" />}
              {eraTimelineLabel(e)}
            </button>
            )
          })}
        </div>
        <div className="bg-surface/70 backdrop-blur-xl border border-outline-variant/50 rounded-full px-lg py-sm flex gap-xl max-w-[95vw] overflow-x-auto hide-scrollbar">
          {tabs.map((tab, i) => {
            const label = 'name' in tab ? tab.name : `${(tab as PhotoPair).year ?? `Mốc ${i + 1}`}`
            return (
              <button
                key={'id' in tab ? tab.id : i}
                type="button"
                onClick={() => {
                  onEngagement?.()
                  onSceneIndexChange(i)
                }}
                className={`font-title-md shrink-0 ${i === sceneIndex ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
