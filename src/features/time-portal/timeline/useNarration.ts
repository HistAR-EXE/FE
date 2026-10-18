// src/features/time-portal/timeline/useNarration.ts
// Thuyết minh bằng giọng đọc tiếng Việt của trình duyệt (Web Speech API).
// Chỉ bật khi thiết bị có sẵn giọng vi-VN.

import { useCallback, useEffect, useRef, useState } from 'react'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

export function useNarration() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const speakingRef = useRef(false)

  useEffect(() => {
    const s = synth()
    if (!s) return
    const pick = () => {
      const vi = s.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('vi'))
      setVoice(vi.find((v) => v.localService) ?? vi[0] ?? null)
    }
    pick()
    s.addEventListener('voiceschanged', pick)
    return () => {
      s.removeEventListener('voiceschanged', pick)
      s.cancel()
    }
  }, [])

  const setSpeak = (v: boolean) => {
    speakingRef.current = v
    setSpeaking(v)
  }

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      const s = synth()
      if (!s || !voice) return
      s.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.voice = voice
      u.lang = voice.lang
      u.rate = 1.02
      u.onend = () => {
        setSpeak(false)
        onEnd?.()
      }
      u.onerror = () => setSpeak(false)
      setSpeak(true)
      s.speak(u)
    },
    [voice],
  )

  const stop = useCallback(() => {
    synth()?.cancel()
    setSpeak(false)
  }, [])

  return { supported: voice !== null, speaking, speakingRef, speak, stop }
}
