import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildArUrl } from './arDeepLink'
import { CU_CHI_AR_SCENES, getArSceneBySlug } from './cuChiArScenes'
import { eraTimelineLabel } from '../time-portal/eraLabels'
import type { CuChiSceneSlug, EraValue } from './types'
import { useArPhotoScenes } from './useArPhotoScenes'

const ARWebcamViewer = lazy(() => import('./ARWebcamViewer').then((m) => ({ default: m.ARWebcamViewer })))
const ARSimViewer = lazy(() => import('./ARSimViewer').then((m) => ({ default: m.ARSimViewer })))

type TimePortalArEmbedProps = {
  locationId: string
  sceneSlug: CuChiSceneSlug
  era: EraValue
  onSceneSlugChange: (slug: CuChiSceneSlug) => void
  onEraChange: (era: EraValue) => void
  discoverKey?: string | null
}

export function TimePortalArEmbed({
  locationId,
  sceneSlug,
  era,
  onSceneSlugChange,
  onEraChange,
  discoverKey,
}: TimePortalArEmbedProps) {
  const config = getArSceneBySlug(sceneSlug)
  const { captionForEra, overlayImageForEra } = useArPhotoScenes(locationId, sceneSlug)
  const caption = captionForEra(era)
  const overlayImage = overlayImageForEra(era)
  const [useCamera, setUseCamera] = useState(true)

  const fullArUrl = useMemo(
    () =>
      buildArUrl({
        locationId,
        mode: 'webcam',
        scene: sceneSlug,
        era,
        discoverKey,
      }),
    [locationId, sceneSlug, era, discoverKey],
  )

  return (
    <div className="absolute inset-0 flex flex-col">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-black text-on-surface-variant text-sm gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
            Đang mở camera AR…
          </div>
        }
      >
        {useCamera ? (
          <ARWebcamViewer
            scene={config}
            era={era}
            historicalImageUrl={overlayImage}
            className="absolute inset-0"
            onCameraUnavailable={() => setUseCamera(false)}
          />
        ) : (
          <ARSimViewer scene={config} era={era} overlayImageUrl={overlayImage} className="absolute inset-0" />
        )}
      </Suspense>

      <footer className="absolute bottom-0 left-0 right-0 z-20 p-3 md:p-4 bg-gradient-to-t from-black/85 via-black/60 to-transparent pointer-events-none">
        <div className="pointer-events-auto max-w-3xl mx-auto flex flex-col gap-2.5">
          {caption && <p className="text-sm text-on-surface/90 line-clamp-2 px-1 drop-shadow-sm">{caption}</p>}
          <div className="flex gap-1 overflow-x-auto hide-scrollbar pb-0.5">
            {CU_CHI_AR_SCENES.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => onSceneSlugChange(s.slug)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border backdrop-blur-sm transition-colors ${
                  s.slug === sceneSlug
                    ? 'border-primary/70 bg-primary/20 text-primary'
                    : 'border-white/15 bg-black/40 text-on-surface/80 hover:border-primary/40'
                }`}
              >
                {s.name.replace(' dưới lòng đất', '').replace(' trong địa đạo', '').replace(' địa đạo', '')}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            {([1948, 1968, 2026] as EraValue[]).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onEraChange(e)}
                className={`flex-1 py-2 rounded-lg text-sm border backdrop-blur-sm transition-colors ${
                  era === e
                    ? 'border-secondary/80 bg-secondary/20 text-secondary'
                    : 'border-white/15 bg-black/40 text-on-surface/80'
                }`}
              >
                {eraTimelineLabel(e)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCamera((v) => !v)}
              className="shrink-0 px-3 py-2 rounded-lg border border-secondary/50 bg-black/40 text-secondary text-xs hover:bg-secondary/15 backdrop-blur-sm"
            >
              {useCamera ? 'Poster' : 'Camera'}
            </button>
            <Link
              to={fullArUrl}
              className="shrink-0 px-3 py-2 rounded-lg border border-white/15 bg-black/40 text-on-surface/80 text-xs hover:border-secondary/40 backdrop-blur-sm hidden sm:inline-block"
            >
              Toàn màn
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
