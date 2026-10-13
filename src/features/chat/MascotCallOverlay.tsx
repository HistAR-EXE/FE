// src/features/chat/MascotCallOverlay.tsx
import { useEffect, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { MascotMode } from './MascotAvatar'
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
            className={`absolute inset-0 m-auto h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(2,117,251,0.25)] transition-opacity duration-300 ${gone ? 'opacity-0' : 'opacity-100'}`}
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
            className={`absolute inset-0 m-auto h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(2,117,251,0.25)] transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
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
        <div className="relative h-full w-full max-w-2xl">
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
            ? 'Chrono đang nghe...'
            : mode === 'speaking'
                ? 'Chrono đang trả lời...'
                : mode === 'thinking'
                    ? 'Chrono đang suy nghĩ...'
                    : 'Chrono đã sẵn sàng')

    const showCard = speaking && answerLines.length > 0
    const MASCOT_IMG = '/mascot/mascot-7.png'

    return (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#FDFEFF] via-[#EAF3FF] to-[#FFFBEB] overflow-hidden">

            {/* 1. LAYER BACKGROUND: Lưới Không Gian & Ánh sáng Ombre */}
            <div className="absolute inset-0 bg-[radial-gradient(#0275FB_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.06] pointer-events-none" />
            <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-[#0275FB]/15 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#FDC908]/20 blur-[150px] rounded-full pointer-events-none" />

            <style>
                {`
          @keyframes organicFloat {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              25% { transform: translateY(-12px) rotate(-1.5deg); }
              50% { transform: translateY(5px) rotate(0deg); }
              75% { transform: translateY(-8px) rotate(1.5deg); }
          }
          @keyframes shadowBreathe {
              0%, 100% { transform: scale(1); opacity: 0.4; }
              25% { transform: scale(0.7); opacity: 0.15; }
              50% { transform: scale(1.1); opacity: 0.5; }
              75% { transform: scale(0.8); opacity: 0.2; }
          }
          @keyframes floatDecor1 {
              0%, 100% { transform: translateY(0px) rotate(3deg); }
              50% { transform: translateY(-15px) rotate(-3deg); }
          }
          @keyframes floatDecor2 {
              0%, 100% { transform: translateY(0px) rotate(-3deg); }
              50% { transform: translateY(-12px) rotate(3deg); }
          }
          @keyframes portalPulse {
              0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
              50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.5; }
          }
          .mascot-float { animation: organicFloat 6s ease-in-out infinite; }
          .mascot-shadow { animation: shadowBreathe 6s ease-in-out infinite; }
          .portal-glow { animation: portalPulse 4s ease-in-out infinite; }
          .decor-1 { animation: floatDecor1 8s ease-in-out infinite; }
          .decor-2 { animation: floatDecor2 6s ease-in-out infinite; }
          `}
            </style>

            {/* 2. FLOATING DECORATIONS: Lấp đầy không gian trống */}
            <div className="hidden md:flex absolute top-[20%] left-[8%] lg:left-[15%] decor-1 z-10 pointer-events-none">
                <div className="bg-white/80 backdrop-blur-xl border border-[#0275FB]/20 px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(2,117,251,0.15)] flex items-center gap-2.5">
                    <MaterialIcon name="psychology" className="text-[#0275FB] text-2xl" />
                    <span className="text-sm font-black text-[#0F1B33]">Lõi AI RAG</span>
                </div>
            </div>
            <div className="hidden md:flex absolute top-[15%] right-[8%] lg:right-[15%] decor-2 z-10 pointer-events-none">
                <div className="bg-[#FFF2C3]/90 backdrop-blur-xl border border-[#FDC908]/50 px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(253,201,8,0.25)] flex items-center gap-2.5">
                    <MaterialIcon name="verified" className="text-[#0F1B33] text-2xl" />
                    <span className="text-sm font-black text-[#0F1B33]">Minh bạch sử liệu</span>
                </div>
            </div>
            <div className="hidden md:flex absolute bottom-[35%] lg:bottom-[30%] left-[10%] lg:left-[18%] decor-2 z-10 pointer-events-none" style={{ animationDelay: '2s' }}>
                <div className="bg-white/80 backdrop-blur-xl border border-emerald-500/30 px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.15)] flex items-center gap-2.5">
                    <MaterialIcon name="history_edu" className="text-emerald-600 text-2xl" />
                    <span className="text-sm font-black text-emerald-800">Nhập vai lịch sử</span>
                </div>
            </div>

            {/* 3. HEADER: GHIM CHẶT Ở TRÊN CÙNG */}
            <div className="absolute top-6 lg:top-8 left-1/2 -translate-x-1/2 w-full flex flex-col items-center z-50 px-4">
                <div className="bg-white/90 backdrop-blur-xl px-8 py-3 rounded-full border border-white shadow-[0_8px_30px_rgba(2,117,251,0.08)] flex items-center gap-4">
            <span className="relative flex h-3.5 w-3.5">
              {/* ĐÃ FIX LOGIC MÀU: Mic TẮT thì Đỏ, Mic MỞ thì Xanh lá */}
                {muted ? (
                    <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                    </>
                ) : mode === 'speaking' || mode === 'thinking' ? (
                    <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FDC908] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FDC908] shadow-[0_0_8px_rgba(253,201,8,0.6)]"></span>
                    </>
                ) : (
                    <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                    </>
                )}
            </span>
                    <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0275FB]">Cuộc Gọi AI • {name}</span>
                        <span className="text-sm font-bold text-[#0F1B33]">{statusLabel}</span>
                    </div>
                </div>
            </div>

            {/* 4. MAIN STAGE: Mascot & Cánh Cổng */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] lg:w-[550px] lg:h-[550px] flex items-center justify-center z-0">
                    <div className="absolute w-[80%] h-[80%] bg-[radial-gradient(circle,#FFF2C3_0%,rgba(2,117,251,0.1)_50%,transparent_70%)] blur-3xl portal-glow" />
                    <div className="absolute w-full h-full border-[3px] border-dashed border-[#0275FB]/30 rounded-full animate-[spin_25s_linear_infinite]" />
                    <div className="absolute w-[80%] h-[80%] border-[2px] border-dotted border-[#FDC908]/70 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                    <div className="absolute w-[60%] h-[60%] border border-[#0275FB]/20 rounded-full animate-[spin_10s_linear_infinite]" />
                </div>

                <div className="relative z-10 w-56 h-56 sm:w-72 sm:h-72 lg:w-[22rem] lg:h-[22rem] flex flex-col items-center justify-center mascot-float">
                    {speaking && images.length > 0 ? (
                        <CallImageStrip urls={images} />
                    ) : (
                        <img src={MASCOT_IMG} alt="Chrono" className={`w-full h-full object-contain drop-shadow-[0_30px_60px_rgba(2,117,251,0.35)] ${mode === 'thinking' ? 'animate-pulse' : ''}`} />
                    )}
                    <div className="absolute -bottom-8 w-40 h-4 bg-[#0275FB]/30 blur-[10px] rounded-[100%] mascot-shadow" />
                </div>

                {showCard && (
                    <aside className="absolute bottom-[160px] lg:bottom-[180px] z-30 w-[90%] max-w-3xl overflow-y-auto rounded-[2rem] border border-white/60 bg-white/90 backdrop-blur-xl px-8 py-5 shadow-[0_20px_50px_rgba(2,117,251,0.15)] text-center animate-[organicFloat_6s_ease-in-out_infinite] pointer-events-auto">
                        <p className="text-base lg:text-lg font-bold leading-relaxed text-[#0F1B33]">{answerLines.join(' ')}</p>
                    </aside>
                )}
            </div>

            {hearing && (
                <div className="absolute top-[15%] right-[5%] z-40 hidden md:flex items-center gap-2.5 rounded-full bg-emerald-100 border-2 border-emerald-500 px-5 py-2.5 text-sm font-black text-emerald-700 shadow-[0_8px_30px_rgba(16,185,129,0.3)] animate-bounce pointer-events-none">
                    <MaterialIcon name="volume_up" className="text-2xl" />
                    <span>Đang phát tiếng...</span>
                </div>
            )}

            {/* 5. UNIFIED CONTROL PANEL (DOCK) */}
            <div className="absolute bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl flex flex-col items-center z-50 px-4">
                <div className="w-full bg-white/80 backdrop-blur-2xl border border-white p-4 rounded-[2.5rem] shadow-[0_20px_60px_rgba(2,117,251,0.15)] flex flex-col items-center gap-3">

                    {/* Thanh hiển thị văn bản Voice Text */}
                    <div className="w-full flex items-center justify-center min-h-[44px] px-4 text-center">
                        {recording && analyser && !muted ? (
                            <div className="flex items-center justify-center gap-4 w-full">
                                {/* Đổi chấm sóng âm thành màu xanh ngọc đồng nhất */}
                                <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                <MicWaveform analyser={analyser} className="h-10 w-48 opacity-80 text-emerald-500" />
                            </div>
                        ) : (
                            <span className="text-[15px] font-black text-[#0F1B33] leading-tight">
                        {heardText ? heardText : (
                            <span className="text-slate-500 font-bold animate-pulse">
                                {muted ? 'Mic đang tắt. Bật Mic để trò chuyện cùng Chrono.' : 'Đang lắng nghe...'}
                            </span>
                        )}
                    </span>
                        )}
                    </div>

                    <div className="w-[80%] h-px bg-gradient-to-r from-transparent via-[#0275FB]/20 to-transparent" />

                    <div className="flex items-center justify-center gap-4 sm:gap-5 w-full">
                        {speaking && onHear && (
                            <button
                                type="button"
                                onClick={onHear}
                                className={`flex h-14 items-center gap-2 rounded-full px-6 text-[15px] font-black cursor-pointer shadow-md transition-all duration-300 hover:scale-105 ${
                                    hearing ? 'bg-emerald-100 text-emerald-700 border border-emerald-500' : 'bg-[#FDC908] text-[#0F1B33] hover:bg-[#FFD93D]'
                                } ${!hearing && !heardAudio ? 'animate-pulse' : ''}`}
                            >
                                <MaterialIcon name="volume_up" className="text-[26px]" />
                                {hearing ? 'Đang nói' : heardAudio ? 'Nghe lại' : 'Nghe'}
                            </button>
                        )}

                        {speaking && onContinue && (
                            <button
                                type="button"
                                onClick={onContinue}
                                className="flex h-14 items-center rounded-full bg-[#EAF3FF] border border-[#0275FB]/30 px-8 text-[15px] font-black text-[#0275FB] shadow-sm hover:bg-[#0275FB] hover:text-white transition-all cursor-pointer"
                            >
                                Tiếp tục
                            </button>
                        )}

                        {/* ĐÃ FIX: Nút Bật/Tắt Mic chỉ giữ lại icon tròn, bỏ văn bản */}
                        {!speaking && (
                            <button
                                type="button"
                                onClick={onToggleMute}
                                className={`flex h-14 w-14 items-center justify-center rounded-full cursor-pointer shadow-sm transition-all duration-300 hover:scale-110 ${
                                    muted
                                        ? 'bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300'
                                        : 'bg-[#EAF3FF] text-[#0275FB] border border-[#0275FB]/30 hover:bg-[#0275FB] hover:text-white hover:shadow-[0_8px_20px_rgba(2,117,251,0.3)]'
                                }`}
                                title={muted ? 'Bật Mic' : 'Tắt Mic'}
                            >
                                <MaterialIcon name={muted ? 'mic_off' : 'mic'} className="text-[28px]" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onHangUp}
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_8px_20px_rgba(239,68,68,0.4)] hover:bg-red-600 hover:scale-110 transition-all duration-300 cursor-pointer"
                            title="Kết thúc cuộc gọi"
                        >
                            <MaterialIcon name="call_end" className="text-[28px]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}