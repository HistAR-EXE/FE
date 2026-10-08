import { useEffect, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { MascotMode } from './MascotAvatar'
import { MascotStage } from './MascotStage'
import { MicWaveform } from './MicWaveform'

type MascotCallOverlayProps = {
  open: boolean
  name: string
  mode: MascotMode
  status: string
  recording: boolean
  heardText: string
  answerLines: string[]
  images: string[]
  speaking: boolean
  hearing: boolean
  heardAudio: boolean
  analyser: AnalyserNode | null
  muted: boolean
  onToggleMute: () => void
  onHangUp: () => void
  onHear?: () => void
  onContinue?: () => void
}

function FadeLayer({ src, hide }: { src: string; hide: boolean }) {
  const [gone, setGone] = useState(hide)
  useEffect(() => {
    if (hide) return
    const frame = window.requestAnimationFrame(() => setGone(true))
    return () => window.cancelAnimationFrame(frame)
  }, [hide])
  return (
    <img
      src={src}
      alt=""
      className={`absolute inset-0 m-auto h-full w-full object-contain transition-opacity duration-300 ${gone ? 'opacity-0' : 'opacity-100'}`}
    />
  )
}

function FadeInLayer({ src, reduced }: { src: string; reduced: boolean }) {
  const [show, setShow] = useState(reduced)
  useEffect(() => {
    if (reduced) return
    const frame = window.requestAnimationFrame(() => setShow(true))
    return () => window.cancelAnimationFrame(frame)
  }, [reduced])
  return (
    <img
      src={src}
      alt=""
      className={`absolute inset-0 m-auto h-full w-full object-contain transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}

function CallImageStrip({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState<string | null>(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    for (const url of urls) {
      const img = new Image()
      img.src = url
    }
  }, [urls])

  useEffect(() => {
    setIndex(0)
    setFading(null)
    if (urls.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % urls.length
        if (!reduced) setFading(urls[current] ?? null)
        return next
      })
    }, 2500)
    return () => window.clearInterval(timer)
  }, [urls, reduced])

  useEffect(() => {
    if (!fading) return
    const timer = window.setTimeout(() => setFading(null), 320)
    return () => window.clearTimeout(timer)
  }, [fading, index])

  const current = urls[index] ?? urls[0]
  if (!current) return null

  return (
    <div className="relative h-[min(52vh,480px)] w-full max-w-xl">
      {fading && <FadeLayer src={fading} hide={reduced} />}
      <FadeInLayer key={current} src={current} reduced={reduced} />
    </div>
  )
}

export function MascotCallOverlay({
  open,
  name,
  mode,
  status,
  recording,
  heardText,
  answerLines,
  images,
  speaking,
  hearing,
  heardAudio,
  analyser,
  muted,
  onToggleMute,
  onHangUp,
  onHear,
  onContinue,
}: MascotCallOverlayProps) {
  if (!open) return null

  const statusLabel =
    status ||
    (mode === 'listening'
      ? 'Chrono đang nghe'
      : mode === 'speaking'
        ? 'Chrono đang trả lời'
        : mode === 'thinking'
          ? 'Chrono đang suy nghĩ'
          : 'Chrono đang nghe')

  const showCard = speaking && answerLines.length > 0

  return (
    <div className="fixed inset-0 z-[80] bg-[#0c0e16] flex flex-col items-center justify-between px-6 py-8">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#fdb438]">Cuộc gọi</p>
        <h2 className="mt-2 text-2xl font-black text-white">{name}</h2>
        <p className="mt-2 text-sm font-semibold text-gray-300">{statusLabel}</p>
      </div>

      <div className="relative flex w-full flex-1 items-center justify-center">
        {speaking ? (
          <CallImageStrip urls={images} />
        ) : (
          <MascotStage mode="idle" paused className="h-[min(52vh,480px)] w-full max-w-3xl" />
        )}

        {hearing && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-black">
            <span className="h-2.5 w-2.5 rounded-full bg-black animate-pulse" />
            Đang phát tiếng
          </div>
        )}

        {showCard && (
          <aside className="absolute top-3 right-3 z-30 max-h-[46vh] w-[min(320px,42vw)] overflow-y-auto rounded-2xl border border-white/15 bg-[#1b1e2c]/95 px-3 py-3 text-left shadow-2xl">
            <p className="text-sm font-medium leading-5 text-white">{answerLines.join(' ')}</p>
          </aside>
        )}
      </div>

      <div className="flex w-full max-w-xl flex-col gap-2">
        {recording && analyser && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
            <MicWaveform analyser={analyser} className="h-8 flex-1" />
          </div>
        )}
        <div className="min-h-10 rounded-xl border border-white/15 bg-[#1b1e2c] px-3 py-2 text-left text-sm font-medium text-white">
          {heardText || <span className="text-gray-500">{recording ? 'Hãy nói. Chrono trả lời khi bạn ngừng.' : '…'}</span>}
        </div>
      </div>
      <div className="flex items-end gap-4">
        {speaking && onHear && (
          <button
            type="button"
            onClick={onHear}
            className={`flex h-16 items-center gap-2 rounded-full px-5 text-sm font-black text-black cursor-pointer ${
              hearing ? 'bg-emerald-500' : 'bg-[#fe951c]'
            } ${!hearing && !heardAudio ? 'animate-pulse' : ''}`}
          >
            <MaterialIcon name="volume_up" className="text-3xl" />
            {hearing ? 'Đang nói' : heardAudio ? 'Nghe lại' : 'Nghe'}
          </button>
        )}
        {speaking && onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="flex h-16 items-center rounded-full bg-white px-5 text-sm font-black text-black cursor-pointer"
          >
            Tiếp tục
          </button>
        )}
        {!speaking && (
          <button
            type="button"
            onClick={onToggleMute}
            className={`flex h-16 items-center gap-2 rounded-full px-4 text-sm font-black cursor-pointer ${
              muted ? 'bg-white/10 text-gray-300' : 'bg-white text-black'
            }`}
          >
            <MaterialIcon name={muted ? 'mic_off' : 'mic'} className="text-3xl" />
            {muted ? 'Bật mic' : 'Mic'}
          </button>
        )}
        <button
          type="button"
          onClick={onHangUp}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white cursor-pointer"
          title="Cúp máy"
        >
          <MaterialIcon name="call_end" className="text-3xl" />
        </button>
      </div>
    </div>
  )
}
