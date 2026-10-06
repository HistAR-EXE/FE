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
  analyser: AnalyserNode | null
  muted: boolean
  onToggleMute: () => void
  onHangUp: () => void
  onSkip?: () => void
}

export function MascotCallOverlay({
  open,
  name,
  mode,
  status,
  recording,
  heardText,
  analyser,
  muted,
  onToggleMute,
  onHangUp,
  onSkip,
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

  return (
    <div className="fixed inset-0 z-[80] bg-[#0c0e16] flex flex-col items-center justify-between px-6 py-8">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#fdb438]">Cuộc gọi</p>
        <h2 className="mt-2 text-2xl font-black text-white">{name}</h2>
        <p className="mt-2 text-sm font-semibold text-gray-300">{statusLabel}</p>
      </div>

      <MascotStage mode={mode} className="h-[min(62vh,560px)] w-full max-w-3xl" />

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
      <div className="flex items-center gap-6">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="h-16 rounded-full bg-white/10 px-5 text-sm font-black text-white"
          >
            Bỏ qua
          </button>
        )}
        <button
          type="button"
          onClick={onToggleMute}
          className={`h-16 w-16 rounded-full flex items-center justify-center cursor-pointer ${
            muted ? 'bg-white/10 text-gray-400' : 'bg-white text-black'
          }`}
          title={muted ? 'Bật mic' : 'Tắt mic'}
        >
          <MaterialIcon name={muted ? 'mic_off' : 'mic'} className="text-3xl" />
        </button>
        <button
          type="button"
          onClick={onHangUp}
          className="h-16 w-16 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer"
          title="Cúp máy"
        >
          <MaterialIcon name="call_end" className="text-3xl" />
        </button>
      </div>
    </div>
  )
}
