import { useCallback, useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { resolveMediaUrl } from '../../shared/config/env'

export type SoundscapePlayerProps = {
  src: string
  loop?: boolean
  defaultVolume?: number
  label?: string
  className?: string
  'data-testid'?: string
}

export function SoundscapePlayer({
  src,
  loop = true,
  defaultVolume = 0.5,
  label = 'Không gian âm thanh',
  className = '',
  'data-testid': testId,
}: SoundscapePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(() => Math.min(1, Math.max(0, defaultVolume)))
  const [playing, setPlaying] = useState(false)

  const resolvedSrc = resolveMediaUrl(src)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = volume
    el.muted = muted
  }, [volume, muted])

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el || error) return
    if (el.paused) {
      void el.play().catch(() => setError('Không phát được âm thanh.'))
    } else {
      el.pause()
    }
  }, [error])

  const toggleMute = useCallback(() => {
    setMuted((m) => !m)
  }, [])

  if (!resolvedSrc) {
    return (
      <div
        data-testid={testId}
        className={`rounded-2xl border border-white/10 bg-[#161824] p-5 ${className}`}
      >
        <p className="text-sm font-bold text-gray-500">Chưa có đường dẫn âm thanh.</p>
      </div>
    )
  }

  return (
    <div
      data-testid={testId}
      className={`rounded-2xl border border-white/10 bg-[#161824] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.4)] ${className}`}
    >
      <audio
        ref={audioRef}
        src={resolvedSrc}
        loop={loop}
        preload="metadata"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setError('Âm thanh chưa sẵn sàng (404 hoặc lỗi mạng).')}
      />

      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-xl bg-[#fe951c]/10 border border-[#fe951c]/30 flex items-center justify-center shrink-0">
          <MaterialIcon name="spatial_audio" className="text-[#fe951c] text-xl" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Soundscape</p>
          <p className="text-sm font-black text-white truncate">{label}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-[#0B1120] border border-red-500/30 px-4 py-3 text-center">
          <MaterialIcon name="error_outline" className="text-red-400 text-2xl mb-1" />
          <p className="text-sm font-bold text-red-300">{error}</p>
          <p className="text-[10px] font-mono text-gray-600 mt-2 break-all">{src}</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#1a79e5] to-[#388cf1] text-white font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(56,140,241,0.35)] cursor-pointer"
          >
            <MaterialIcon name={playing ? 'pause_circle' : 'play_circle'} className="text-lg" />
            {playing ? 'Tạm dừng' : 'Phát loop'}
          </button>

          <div className="flex-1 flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
              onClick={toggleMute}
              className="shrink-0 w-10 h-10 rounded-xl border border-white/10 bg-[#0B1120] flex items-center justify-center text-gray-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
            >
              <MaterialIcon name={muted || volume === 0 ? 'volume_off' : 'volume_up'} className="text-xl" />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : Math.round(volume * 100)}
              onChange={(e) => {
                const v = Number(e.target.value) / 100
                setVolume(v)
                if (v > 0) setMuted(false)
              }}
              className="flex-1 h-2 rounded-full appearance-none bg-white/10 accent-[#fe951c] cursor-pointer"
              aria-label="Âm lượng"
            />
            <span className="text-[10px] font-black text-gray-500 w-8 text-right tabular-nums">
              {muted ? 0 : Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
