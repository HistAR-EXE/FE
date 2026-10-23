import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortalAudio } from './portalAudioController'
import type { PortalAudioState } from './portalAudioController'

const initial: PortalAudioState = { narrationEnabled: true, musicEnabled: true, volume: .24, speaking: false, waitingForNarration: false, supported: false, blocked: false, status: '' }

/** One audio session belongs to the whole portal, across timeline/comparison/3D. */
export function usePortalAudio(enabled = true) {
  const controller = useRef<ReturnType<typeof createPortalAudio> | null>(null)
  const [state, setState] = useState(initial)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!enabled) { setReady(false); return }
    const c = createPortalAudio({ speech: window.speechSynthesis ?? null, audio: new Audio('/audio/time-portal/war-epic-v1.mp3'), utterance: value => new SpeechSynthesisUtterance(value) })
    controller.current = c
    const unsubscribe = c.subscribe(() => setState(c.getSnapshot()))
    c.segment('portal-background', '')
    setState(c.getSnapshot())
    setReady(true)
    // Any valid first interaction can recover browser-blocked autoplay.
    const unlock = () => { if (c.getSnapshot().blocked) c.start() }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      unsubscribe(); c.dispose(); controller.current = null
    }
  }, [enabled])
  const controls = useMemo(() => ({
    start: () => controller.current?.start(),
    segment: (key: string, text: string) => controller.current?.segment(key, text),
    setPaused: (value: boolean) => controller.current?.setPaused(value),
  }), [])
  return { ...state, ready, ...controls }
}
