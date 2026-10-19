// src/features/minigame/sfx.ts
// Âm thanh ngắn cho mini game, tổng hợp bằng WebAudio (không cần tệp âm thanh). Có nút tắt tiếng.

const MUTE_KEY = 'histar_sfx_muted'

type AudioHost = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null

export function isSfxMuted(): boolean {
    try {
        return window.localStorage.getItem(MUTE_KEY) === '1'
    } catch {
        return false
    }
}

export function setSfxMuted(muted: boolean) {
    try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
        // Không lưu được thì chỉ tắt trong phiên này.
    }
}

function audio(): AudioContext | null {
    if (typeof window === 'undefined' || isSfxMuted()) return null
    const Ctor: typeof AudioContext | undefined = globalThis.AudioContext ?? (window as AudioHost).webkitAudioContext
    if (!Ctor) return null
    try {
        const current = ctx ?? new Ctor()
        ctx = current
        if (current.state === 'suspended') void current.resume()
        return current
    } catch {
        return null
    }
}

type ToneOptions = { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number }

function tone(freq: number, duration: number, { type = 'sine', gain = 0.12, delay = 0, slideTo }: ToneOptions = {}) {
    const ac = audio()
    if (!ac) return
    const start = ac.currentTime + delay
    const osc = ac.createOscillator()
    const amp = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration)
    amp.gain.setValueAtTime(0.0001, start)
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.01)
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(amp).connect(ac.destination)
    osc.start(start)
    osc.stop(start + duration + 0.02)
}

/** Tiếng "cộc" ngắn (cuốc chạm đất), to nhỏ theo volume 0..1. */
function knock(volume: number, delay = 0) {
    const ac = audio()
    if (!ac) return
    const start = ac.currentTime + delay
    const length = Math.floor(ac.sampleRate * 0.09)
    const buffer = ac.createBuffer(1, length, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
    const src = ac.createBufferSource()
    src.buffer = buffer
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const amp = ac.createGain()
    amp.gain.value = 0.05 + 0.5 * Math.max(0, Math.min(1, volume))
    src.connect(filter).connect(amp).connect(ac.destination)
    src.start(start)
}

export const sfx = {
    tap: () => tone(520, 0.06, { type: 'triangle', gain: 0.07 }),
    rotate: () => tone(340, 0.05, { type: 'square', gain: 0.035 }),
    good: () => {
        tone(660, 0.09)
        tone(880, 0.14, { delay: 0.08 })
    },
    bad: () => tone(200, 0.24, { type: 'sawtooth', gain: 0.06, slideTo: 110 }),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { delay: i * 0.1, gain: 0.1 })),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.22, { delay: i * 0.14, type: 'triangle', gain: 0.08 })),
    tick: () => tone(1100, 0.03, { type: 'square', gain: 0.025 }),
    knock: (volume: number) => {
        knock(volume)
        knock(volume * 0.8, 0.28)
    },
    step: () => knock(0.35),
}

export function buzz(pattern: number | number[]) {
    try {
        navigator.vibrate?.(pattern)
    } catch {
        // Trình duyệt không hỗ trợ rung.
    }
}
