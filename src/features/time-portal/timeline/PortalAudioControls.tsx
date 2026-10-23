import type { usePortalAudio } from './usePortalAudio'

/** Only show the browser-required recovery action, never playback switches. */
export function PortalAudioControls({ audio, className = '' }: { audio: ReturnType<typeof usePortalAudio>; className?: string }) {
  if (!audio.blocked) {
    return !audio.supported && audio.status
      ? <p className={`text-xs text-slate-500 ${className}`} role="status">{audio.status}</p>
      : null
  }
  return <div className={`flex flex-wrap items-center gap-2 text-xs text-slate-600 ${className}`} role="status">
    <span>Trình duyệt yêu cầu tương tác để phát âm thanh.</span>
    <button type="button" className="rounded-full border border-amber-300 bg-amber-100 px-3 py-2 font-bold text-blue-800" onClick={audio.start}>Bắt đầu trải nghiệm âm thanh</button>
  </div>
}
