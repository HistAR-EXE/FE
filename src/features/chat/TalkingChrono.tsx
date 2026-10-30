import { useEffect, useId, useRef } from 'react'
import chronoBase from '../../assets/mascot-chrono-call-base.png'
import { getSpeechMouthOpenness } from './voice'

/** Mouth opening follows the actual TTS media clock, including silent pauses.
 * This is amplitude synchronization, not a phoneme-to-viseme model.
 */
export function TalkingChrono() {
    const mouthRef = useRef<SVGGElement>(null)
    const smileRef = useRef<SVGPathElement>(null)
    const avatarRef = useRef<HTMLDivElement>(null)
    const clipId = useId().replace(/:/g, '')
    useEffect(() => {
        let frame = 0
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
        const draw = () => {
            const level = document.hidden ? 0 : getSpeechMouthOpenness()
            const opening = reduced.matches ? level * .45 : level
            if (mouthRef.current) {
                mouthRef.current.style.transform = `scaleY(${.04 + opening * .96})`
                mouthRef.current.style.opacity = level > .02 ? '1' : '0'
            }
            if (smileRef.current) smileRef.current.style.opacity = level > .02 ? '0' : '1'
            avatarRef.current?.setAttribute('data-mouth-open', level.toFixed(3))
            frame = requestAnimationFrame(draw)
        }
        draw()
        return () => cancelAnimationFrame(frame)
    }, [])
    const shape = 'M -63 0 Q 0 17 63 0 C 80 -6 61 87 0 87 C -61 87 -80 -6 -63 0 Z'
    return <div ref={avatarRef} className="chrono-talking-avatar" data-mouth-open="0">
        <img src={chronoBase} alt="Chrono" draggable={false} className="chrono-call-avatar" />
        <svg className="chrono-call-face" viewBox="0 0 1254 1254" aria-hidden="true">
            <defs><clipPath id={clipId}><path d={shape} /></clipPath></defs>
            <g transform="translate(623 604)">
                <path ref={smileRef} d="M -57 12 Q 0 43 57 12" fill="none" stroke="#80353b" strokeWidth="7" strokeLinecap="round" />
                <g ref={mouthRef} className="chrono-call-mouth" style={{ opacity: 0, transform: 'scaleY(.04)' }}>
                    <path d={shape} fill="#8a1321" stroke="#a42a35" strokeWidth="3" />
                    <g clipPath={`url(#${clipId})`}>
                        <ellipse cx="0" cy="82" rx="53" ry="37" fill="#f65865" />
                        <ellipse cx="0" cy="82" rx="38" ry="27" fill="#ff7780" />
                    </g>
                </g>
            </g>
        </svg>
    </div>
}
