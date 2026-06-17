import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { eraTimelineLabel } from '../time-portal/eraLabels'
import type { ARMode, ARTrackingState, CuChiSceneSlug, EraValue } from './types'
import { CU_CHI_AR_SCENES } from './cuChiArScenes'
import { buildPortalUrl } from './arDeepLink'

const ERAS: EraValue[] = [1948, 1968, 2026]

type ARHudProps = {
  locationId: string
  sceneSlug: CuChiSceneSlug
  era: EraValue
  mode: ARMode
  caption: string
  sceneName: string
  tracking?: ARTrackingState
  onSceneChange: (slug: CuChiSceneSlug) => void
  onEraChange: (era: EraValue) => void
  onModeChange: (mode: ARMode) => void
  showTargetPanel?: boolean
  targetImage?: string
}

export function ARHud({
  locationId,
  sceneSlug,
  era,
  mode,
  caption,
  sceneName,
  tracking = 'idle',
  onSceneChange,
  onEraChange,
  onModeChange,
  showTargetPanel,
  targetImage,
}: ARHudProps) {
  const trackingLabel = (): string => {
    if (mode === 'sim') return 'Di chuột nhẹ để lệch góc nhìn · ảnh lịch sử phủ lên hiện trạng'
    if (tracking === 'found') return 'Đã tái hiện — ảnh lịch sử ghép lên không gian'
    if (tracking === 'scanning') return 'Đang nhận diện bối cảnh…'
    if (tracking === 'lost') return 'Mất dấu — hãy căn lại poster hoặc ảnh mục tiêu'
    return 'Hướng camera vào poster hoặc ảnh mục tiêu'
  }

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-30 flex items-start justify-between gap-2 p-3 md:p-4 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2 min-w-0">
          <Link
            to={buildPortalUrl(locationId, CU_CHI_AR_SCENES.find((s) => s.slug === sceneSlug)?.sceneId, era)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface/85 border border-outline-variant text-on-surface-variant hover:text-secondary text-sm backdrop-blur-md w-fit"
          >
            <MaterialIcon name="arrow_back" className="text-base" />
            So sánh ảnh
          </Link>
          {mode === 'sim' && (
            <div className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-on-surface/80 text-xs max-w-xs backdrop-blur-md">
              Demo laptop — không cần camera
            </div>
          )}
        </div>
        <div className="pointer-events-auto flex gap-1 bg-surface/85 border border-outline-variant rounded-full p-1 backdrop-blur-md">
          {(['sim', 'webcam', 'live'] as ARMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`px-2.5 py-1 rounded-full text-xs font-label-sm transition-colors ${
                mode === m ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {m === 'sim' ? 'Demo' : m === 'webcam' ? 'Webcam' : 'Mobile'}
            </button>
          ))}
        </div>
      </header>

      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-[92%] max-w-md">
        <div
          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-[11px] ${
            tracking === 'found' && mode !== 'sim'
              ? 'border-secondary/50 bg-black/50 text-secondary'
              : 'border-white/10 bg-black/45 text-on-surface/75'
          }`}
        >
          {mode !== 'sim' && tracking === 'scanning' && (
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0" />
          )}
          {trackingLabel()}
        </div>
      </div>

      {showTargetPanel && targetImage && mode !== 'sim' && (
        <aside className="absolute right-3 bottom-28 z-20 w-36 md:w-44 rounded-xl overflow-hidden border-2 border-secondary/50 shadow-lg hidden sm:block">
          <p className="text-[10px] uppercase tracking-wider bg-surface/95 px-2 py-1 text-secondary text-center">Ảnh mục tiêu</p>
          <img src={targetImage} alt="Ảnh mục tiêu AR" className="w-full aspect-[4/3] object-cover" />
        </aside>
      )}

      <footer className="absolute bottom-0 left-0 right-0 z-30 p-3 md:p-4 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="pointer-events-auto max-w-3xl mx-auto flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-title-md text-title-md text-on-surface">{sceneName}</h1>
              <span className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] uppercase tracking-wider">
                Mới
              </span>
            </div>
            {caption && <p className="text-sm text-on-surface-variant line-clamp-2">{caption}</p>}
          </div>

          <div className="flex gap-1 overflow-x-auto hide-scrollbar pb-1">
            {CU_CHI_AR_SCENES.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => onSceneChange(s.slug)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  s.slug === sceneSlug
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-outline-variant bg-surface-container/80 text-on-surface-variant hover:border-secondary/50'
                }`}
              >
                {s.name.replace(' dưới lòng đất', '').replace(' trong địa đạo', '').replace(' địa đạo', '')}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {ERAS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onEraChange(e)}
                className={`flex-1 py-2 rounded-lg text-sm font-label-sm border transition-colors ${
                  era === e ? 'border-secondary bg-secondary/15 text-secondary' : 'border-outline-variant text-on-surface-variant'
                }`}
              >
                {eraTimelineLabel(e)}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}

export function ARLoadingFallback({ label = 'Đang tải AR…' }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-12 h-12 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ARShell({ children }: { children: ReactNode }) {
  return <div className="relative w-full h-full min-h-[calc(100dvh-3.5rem)] bg-black overflow-hidden">{children}</div>
}
