import { PortalHistoricalImage } from './PortalHistoricalImage'
import { eraLabel } from './arPortalStyles'
import type { EraValue } from './types'
import './arPortal.css'

type ARViewfinderHudProps = {
  era: EraValue
  tracking?: 'scanning' | 'found' | 'idle' | 'lost'
  mode: 'camera' | 'poster'
}

/** Khung AR tối giản — giống tablet viện bảo tàng. */
export function ARViewfinderHud({ era, tracking = 'idle', mode }: ARViewfinderHudProps) {
  const scanning = tracking === 'scanning'

  return (
    <>
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 border border-white/10 backdrop-blur-sm">
          <span className={`w-2 h-2 rounded-full ${scanning ? 'bg-primary animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] font-semibold tracking-widest text-white/90">AR</span>
        </span>
        <span className="text-[10px] text-white/60 uppercase tracking-wide hidden sm:inline">
          {mode === 'camera' ? 'Camera trực tiếp' : 'Tái hiện tại điểm'}
        </span>
      </div>

      {era !== 2026 && tracking === 'found' && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-black/55 border border-primary/40 text-primary text-[10px] font-semibold tracking-wide backdrop-blur-sm">
            {eraLabel(era)}
          </span>
        </div>
      )}

      {scanning && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none px-[8%] pb-[20%] pt-[12%]">
          <div className="relative w-full max-w-2xl aspect-[4/3] border border-primary/50 rounded-sm history-portal-pulse shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
            <p className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-primary bg-black/65 px-3 py-1 rounded-full backdrop-blur-sm">
              Đang ghép ảnh lịch sử lên không gian…
            </p>
          </div>
        </div>
      )}
    </>
  )
}

type ARHistoricalPortalProps = {
  historicalImageUrl?: string
  fallbackImageUrl: string
  sceneName: string
  era: EraValue
  imageFilter: string
  visible: boolean
}

export function ARHistoricalPortal({
  historicalImageUrl,
  fallbackImageUrl,
  sceneName,
  era,
  imageFilter,
  visible,
}: ARHistoricalPortalProps) {
  if (!visible || era === 2026) return null

  return (
    <>
      <div className="history-portal-dim absolute inset-0 pointer-events-none z-[5]" style={{ opacity: 0.45 }} />
      <div className="absolute inset-0 z-10 flex items-end justify-center px-[4%] pb-[22%] pt-[14%] pointer-events-none">
        <div
          className="history-portal-frame history-portal-frame--enter relative w-full max-w-4xl"
          style={{ transform: 'perspective(900px) rotateX(4deg)', transformOrigin: 'center bottom' }}
        >
          <div className="history-portal-frame__inner aspect-[16/10] w-full shadow-2xl">
            <PortalHistoricalImage
              src={historicalImageUrl}
              fallback={fallbackImageUrl}
              alt={sceneName}
              era={era}
              filter={imageFilter}
            />
            <div className="history-portal-grain absolute inset-0 z-[1]" />
            <div className="history-portal-scanline absolute inset-0 z-[1]" />
          </div>
        </div>
      </div>
    </>
  )
}
