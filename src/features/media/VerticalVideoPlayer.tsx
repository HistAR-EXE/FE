import { useCallback, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { resolveMediaUrl } from '../../shared/config/env'

export type VerticalVideoPlayerProps = {
  /** Relative `/media/...` path or absolute R2 URL */
  src: string
  poster?: string | null
  className?: string
  'data-testid'?: string
}

export function VerticalVideoPlayer({ src, poster, className = '', 'data-testid': testId }: VerticalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  const resolvedSrc = resolveMediaUrl(src)
  const resolvedPoster = poster ? resolveMediaUrl(poster) : undefined

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el || error) return
    if (el.paused) {
      void el.play().catch(() => setError('Không phát được video.'))
    } else {
      el.pause()
    }
  }, [error])

  if (!resolvedSrc) {
    return (
      <div
        data-testid={testId}
        className={`aspect-[9/16] max-w-[min(100%,360px)] mx-auto rounded-2xl border border-white/10 bg-[#161824] flex items-center justify-center ${className}`}
      >
        <p className="text-sm font-bold text-gray-500 px-4 text-center">Chưa có đường dẫn video.</p>
      </div>
    )
  }

  return (
    <div
      data-testid={testId}
      className={`relative aspect-[9/16] max-w-[min(100%,360px)] mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.6)] ${className}`}
    >
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-[#161824]">
          <MaterialIcon name="videocam_off" className="text-4xl text-gray-500" />
          <p className="text-sm font-bold text-gray-400">{error}</p>
          <p className="text-[10px] font-mono text-gray-600 break-all">{src}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            src={resolvedSrc}
            poster={resolvedPoster}
            playsInline
            preload="metadata"
            controls
            controlsList="nodownload noremoteplayback"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setError('Video chưa sẵn sàng (404 hoặc lỗi mạng).')}
          />
          <button
            type="button"
            aria-label={playing ? 'Tạm dừng' : 'Phát'}
            onClick={togglePlay}
            className="absolute bottom-14 right-3 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-[#fe951c]/90 hover:text-black transition-colors md:hidden"
          >
            <MaterialIcon name={playing ? 'pause' : 'play_arrow'} className="text-2xl" />
          </button>
        </>
      )}
    </div>
  )
}
