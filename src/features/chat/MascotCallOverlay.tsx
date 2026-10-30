import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { MascotMode } from './MascotAvatar'
import { TalkingChrono } from './TalkingChrono'
import './chat-call.css'

type MascotCallOverlayProps = {
    open: boolean
    name: string
    mode: MascotMode
    status: string
    recording: boolean
    speaking: boolean
    hearing: boolean
    heardAudio: boolean
    preparingAudio?: boolean
    muted: boolean
    onToggleMute: () => void
    onHangUp: () => void
    onRestartQuestion: () => void
    onHear?: () => void
    onContinue?: () => void
}

function CallDuration() {
    const [started] = useState(() => Date.now())
    const [elapsed, setElapsed] = useState(0)
    useEffect(() => {
        const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
        return () => window.clearInterval(timer)
    }, [started])
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const seconds = String(elapsed % 60).padStart(2, '0')
    return <span className="chrono-call-duration" aria-label={`Thời gian cuộc gọi: ${minutes} phút ${seconds} giây`}>
        <Icon name="schedule" /><span>{minutes}:{seconds}</span>
    </span>
}

function Icon({ name }: { name: string }) {
    return <span className="chrono-call-icon" aria-hidden="true"><MaterialIcon name={name} /></span>
}

export function MascotCallOverlay({ open, name, mode, status, recording,
    speaking, hearing, heardAudio, preparingAudio = false, muted,
    onToggleMute, onHangUp, onRestartQuestion, onHear, onContinue }: MascotCallOverlayProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const hangUpRef = useRef(onHangUp)
    useEffect(() => { hangUpRef.current = onHangUp }, [onHangUp])
    useEffect(() => {
        if (!open) return
        const previous = document.activeElement as HTMLElement | null
        const overflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        dialogRef.current?.focus()
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); hangUpRef.current(); return }
            if (event.key !== 'Tab') return
            const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
            const first = buttons[0], last = buttons.at(-1)
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
                event.preventDefault(); last?.focus()
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
                event.preventDefault(); first?.focus()
            }
        }
        document.addEventListener('keydown', handleKey)
        return () => {
            document.body.style.overflow = overflow
            document.removeEventListener('keydown', handleKey)
            previous?.focus()
        }
    }, [open])
    if (!open) return null
    const state = hearing ? 'talking' : preparingAudio || mode === 'thinking' ? 'thinking'
        : muted ? 'muted' : speaking ? 'ready' : 'listening'
    const phase = hearing ? 'Chrono đang nói' : preparingAudio ? 'Đang chuẩn bị giọng đọc'
        : mode === 'thinking' ? 'Chrono đang suy nghĩ' : muted ? 'Mic đang tắt'
            : speaking ? 'Đến lượt bạn rồi' : recording ? 'Mình đang lắng nghe bạn' : 'Sẵn sàng trò chuyện'
    const helper = speaking ? 'Chọn Hỏi tiếp để ngắt lời và bắt đầu câu hỏi mới.'
        : muted ? 'Bật mic khi bạn sẵn sàng trò chuyện.' : 'Nói nhầm? Chọn Hỏi lại để bỏ câu này và nói câu mới.'
    const micLabel = muted ? 'Bật mic' : 'Tắt mic'
    const replayLabel = preparingAudio ? 'Chuẩn bị' : hearing ? 'Đang nói' : heardAudio ? 'Nghe lại' : 'Nghe'
    return createPortal(
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Cuộc gọi với ${name}`}
            tabIndex={-1} lang="vi" className={`chrono-call is-${state}`}>
            <header className="chrono-call-header">
                <div className="chrono-call-brand">
                    <span className="chrono-call-brand-mark" aria-hidden="true"><Icon name="auto_awesome" /></span>
                    <div><span className="chrono-call-brand-name">TimeLens</span><span className="chrono-call-eyebrow">CUỘC GỌI CÙNG CHRONO</span></div>
                </div>
                <div className="chrono-call-session"><span className="chrono-call-session-dot" aria-hidden="true" /><CallDuration /></div>
            </header>
            <div className="chrono-call-room">
                <main className="chrono-call-stage" aria-label="Chrono đồng hành">
                    <div className="chrono-call-avatar-halo" aria-hidden="true"><span /><span /></div>
                    <TalkingChrono />
                </main>
                <div className="chrono-call-identity">
                    <h1>{name}</h1>
                    <div className="chrono-call-status" role="status">
                        <span className="chrono-call-state-icon" aria-hidden="true"><Icon name={hearing ? 'graphic_eq' : state === 'thinking' ? 'more_horiz' : muted ? 'mic_off' : speaking ? 'chat_bubble_outline' : 'mic'} /></span>
                        <span>{phase}</span>
                    </div>
                </div>
                <footer className="chrono-call-dock">
                    <div className="chrono-call-controls" role="group" aria-label="Điều khiển cuộc gọi">
                        <button type="button" onClick={onToggleMute} disabled={speaking}
                            className={`chrono-call-control chrono-call-mic ${muted ? 'is-muted' : ''}`}
                            aria-label={micLabel} aria-pressed={muted} title={speaking ? 'Mic tạm tắt. Chọn Hỏi tiếp để nói.' : micLabel}>
                            <span className="chrono-call-control-symbol"><Icon name={muted || speaking ? 'mic_off' : 'mic'} /></span>
                            <span className="chrono-call-control-label">{muted ? 'Bật mic' : 'Mic'}</span>
                        </button>
                        <button type="button" onClick={onHear} disabled={!speaking || !onHear || preparingAudio || hearing}
                            className="chrono-call-control chrono-call-replay" aria-label={replayLabel}
                            title={!speaking ? 'Có thể nghe lại sau khi Chrono trả lời' : replayLabel}>
                            <span className="chrono-call-control-symbol"><Icon name={preparingAudio ? 'hourglass_top' : hearing ? 'volume_up' : 'replay'} /></span>
                            <span className="chrono-call-control-label">{replayLabel}</span>
                        </button>
                        <button type="button" onClick={onContinue} disabled={!speaking || !onContinue} className="chrono-call-control chrono-call-next">
                            <span className="chrono-call-control-symbol"><Icon name="mic" /></span><span className="chrono-call-control-label">Hỏi tiếp</span>
                        </button>
                        <button type="button" onClick={onRestartQuestion} className="chrono-call-control chrono-call-restart"
                            aria-label="Hủy câu hỏi và hỏi lại" title="Bỏ câu đang nói hoặc đang chờ trả lời, mở mic cho câu mới">
                            <span className="chrono-call-control-symbol"><Icon name="restart_alt" /></span>
                            <span className="chrono-call-control-label">Hỏi lại</span>
                        </button>
                        <span className="chrono-call-control-divider" aria-hidden="true" />
                        <button type="button" onClick={onHangUp} aria-label="Kết thúc cuộc gọi" title="Kết thúc cuộc gọi"
                            className="chrono-call-control chrono-call-hangup"><span className="chrono-call-control-symbol"><Icon name="call_end" /></span><span className="chrono-call-control-label">Kết thúc</span></button>
                    </div>
                    <p className="chrono-call-hint">{helper}</p>
                    <span className="sr-only">{status}</span>
                </footer>
            </div>
        </div>, document.body,
    )
}
