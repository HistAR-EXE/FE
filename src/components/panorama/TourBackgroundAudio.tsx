import { useEffect, useRef, useState } from 'react'
import soundtrack from '../../assets/audio/technological-symphony_88314.mp3'
import { MaterialIcon } from '../ui/MaterialIcon'

export function TourBackgroundAudio() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.35
    // Autoplay may require user activation. The visible button remains available.
    void audio.play().catch(() => {})
    return () => { audio.pause() }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
    } else {
      setFailed(false)
      void audio.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'NotAllowedError') return
        setFailed(true)
      })
    }
  }

  const label = failed ? 'Không tải được nhạc nền. Bấm để thử lại' : playing ? 'Tắt nhạc nền' : 'Bật nhạc nền'

  return (
    <>
      <audio
        ref={audioRef}
        src={soundtrack}
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => { setPlaying(false); setFailed(true) }}
      />
      <button
        type="button"
        className={`tour360-hud-btn ${playing ? 'is-active' : ''}`}
        onClick={toggle}
        aria-label={label}
        aria-pressed={playing}
        title={label}
      >
        <MaterialIcon name={playing ? 'volume_up' : 'volume_off'} />
      </button>
    </>
  )
}
