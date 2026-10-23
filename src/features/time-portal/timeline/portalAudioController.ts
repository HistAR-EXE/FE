type Options = {
  speech: SpeechSynthesis | null
  audio: HTMLAudioElement
  utterance: (text: string) => SpeechSynthesisUtterance
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  onEnd?: () => void
}
export type PortalAudioState = {
  narrationEnabled: boolean; musicEnabled: boolean; volume: number; speaking: boolean
  waitingForNarration: boolean; supported: boolean; blocked: boolean; status: string
}
const INTRO = 'Chào mừng bạn đến với Cổng Thời Gian. Hãy cùng khám phá hành trình lịch sử Địa đạo Củ Chi. '
export function createPortalAudio({ speech, audio, utterance, storage, onEnd }: Options) {
  const read = (key: string, fallback: string) => { try { return storage?.getItem(key) ?? fallback } catch { return fallback } }
  const savedVolume = Number(read('portal-volume', '.24'))
  let musicBlocked = false, speechBlocked = false, started = false
  let state: PortalAudioState = { narrationEnabled: read('portal-narration', 'true') !== 'false', musicEnabled: read('portal-music', 'true') !== 'false', volume: Math.min(1, Math.max(0, Number.isFinite(savedVolume) ? savedVolume : .24)), speaking: false, waitingForNarration: false, supported: false, blocked: false, status: '' }
  let paused = false, disposed = false, token = 0, musicToken = 0, key = '', text = '', introRead = false, active = false, pending = false
  let fade: ReturnType<typeof setInterval> | undefined
  let watchdog: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  const patch = (next: Partial<PortalAudioState>) => { if (disposed) return; state = { ...state, ...next }; listeners.forEach(fn => fn()) }
  const blocked = (source: 'music' | 'speech', value: boolean) => { if (source === 'music') musicBlocked = value; else speechBlocked = value; patch({ blocked: musicBlocked || speechBlocked }) }
  const save = (name: string, value: unknown) => { try { storage?.setItem(name, String(value)) } catch { /* private browsing */ } }
  const volume = () => {
    if (fade) clearInterval(fade)
    const target = state.musicEnabled ? state.volume * (state.speaking ? .29 : 1) : 0
    const decrement = audio.volume / 5
    let steps = 0
    fade = setInterval(() => {
      const delta = target - audio.volume
      audio.volume = Math.max(0, Math.min(1, state.musicEnabled ? audio.volume + delta * .25 : audio.volume - decrement))
      steps++
      if ((state.musicEnabled && Math.abs(delta) < .005) || (!state.musicEnabled && steps >= 5)) {
        audio.volume = target; clearInterval(fade); fade = undefined
        if (!state.musicEnabled) audio.pause()
      }
    }, 40)
  }
  audio.loop = true; audio.volume = 0
  const music = (fadeOff = false) => {
    volume()
    if (paused || disposed || !state.musicEnabled) { if (!fadeOff || paused || disposed) audio.pause(); return }
    const attempt = ++musicToken
    void audio.play().then(() => { if (disposed || paused) audio.pause(); else if (state.musicEnabled) blocked('music', false) }).catch((error: unknown) => {
      if (disposed || attempt !== musicToken || paused || !state.musicEnabled) return
      const missing = error instanceof Error && error.name === 'NotSupportedError'
      blocked('music', !missing); patch({ status: missing ? 'Không tải được nhạc nền.' : 'Trình duyệt đang chặn âm thanh. Hãy bắt đầu trải nghiệm.' })
    })
  }
  const cancel = () => { token++; active = false; clearTimeout(watchdog); speech?.cancel(); patch({ speaking: false, waitingForNarration: false }); volume() }
  const voice = () => { const voices = speech?.getVoices().filter(v => /^vi(?:-|_|$)/i.test(v.lang)) ?? []; return voices.find(v => v.localService) ?? voices[0] }
  const armWatchdog = (session: number) => {
    clearTimeout(watchdog)
    watchdog = setTimeout(() => { if (session !== token || paused || started) return; token++; active = false; pending = true; speech?.cancel(); blocked('speech', true); patch({ speaking: false, waitingForNarration: false, status: 'Hãy bắt đầu trải nghiệm để nghe lời đọc.' }); volume() }, 8000)
  }
  const speak = () => {
    if (disposed || paused || !pending || !state.narrationEnabled || !text.trim()) return
    const selected = voice()
    patch({ supported: !!selected })
    if (!selected) { patch({ waitingForNarration: false, status: speech ? 'Thiết bị chưa có giọng tiếng Việt. Nội dung vẫn tiếp tục.' : 'Trình duyệt không hỗ trợ thuyết minh.' }); return }
    pending = false; active = true; started = false
    const session = ++token
    const u = utterance((introRead ? '' : INTRO) + text)
    u.voice = selected; u.lang = selected.lang; u.rate = 1.02
    const finish = (success: boolean, message = '') => {
      if (disposed || session !== token || !active) return
      active = false; clearTimeout(watchdog)
      if (success) introRead = true
      patch({ speaking: false, waitingForNarration: false, status: message || 'Đã đọc xong.' }); volume()
      if (success) onEnd?.()
    }
    u.onend = () => finish(true)
    u.onerror = event => {
      if (event.error === 'not-allowed' && session === token) { pending = true; blocked('speech', true) }
      finish(false, 'Không thể phát lời đọc. Nội dung vẫn tiếp tục.')
    }
    u.onstart = () => { if (session === token && active) { started = true; clearTimeout(watchdog); blocked('speech', false); patch({ status: 'Đang thuyết minh.' }) } }
    patch({ speaking: true, waitingForNarration: true, status: 'Đang thuyết minh.' }); volume()
    // A silent browser rejection must not hold the timeline indefinitely.
    armWatchdog(session)
    try { speech?.speak(u) } catch { finish(false, 'Không thể phát lời đọc. Nội dung vẫn tiếp tục.') }
  }
  const voicesChanged = () => { patch({ supported: !!voice() }); speak() }
  speech?.addEventListener('voiceschanged', voicesChanged)
  state = { ...state, supported: !!voice() }
  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    segment(nextKey: string, nextText: string) { if (key === nextKey && text === nextText) return; cancel(); key = nextKey; text = nextText; if (!text.trim()) blocked('speech', false); pending = true; speak(); music() },
    setPaused(value: boolean) { if (paused === value) return; paused = value; if (paused) { speech?.pause(); clearTimeout(watchdog) } else { speech?.resume(); if (!active) speak(); else if (!started) armWatchdog(token) }; music() },
    toggleNarration() { const enabled = !state.narrationEnabled; cancel(); blocked('speech', false); patch({ narrationEnabled: enabled, status: enabled ? '' : 'Đã tắt thuyết minh.' }); save('portal-narration', enabled); pending = enabled; speak() },
    toggleMusic() { patch({ musicEnabled: !state.musicEnabled }); save('portal-music', state.musicEnabled); if (!state.musicEnabled) blocked('music', false); music(true) },
    setVolume(value: number) { patch({ volume: Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .24 }); save('portal-volume', state.volume); volume() },
    replay() { cancel(); pending = true; speak() },
    start() { if (!paused) { speech?.resume(); speak() }; music() },
    dispose() { disposed = true; token++; clearInterval(fade); clearTimeout(watchdog); speech?.removeEventListener('voiceschanged', voicesChanged); speech?.cancel(); audio.pause(); audio.removeAttribute('src'); audio.load(); listeners.clear() },
  }
}
