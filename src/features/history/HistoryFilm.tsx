// src/features/history/HistoryFilm.tsx
import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { resumePosition, switchPosition } from './progress'

const SOURCES = {
    '1080': import.meta.env.VITE_CU_CHI_FILM_URL?.trim() || '/films/cu-chi-1080p-v2.mp4',
    '720': import.meta.env.VITE_CU_CHI_FILM_720_URL?.trim() || '/films/cu-chi-v1.mp4',
}
const KEY = 'timelens:cu-chi-film:v1'

export default function HistoryFilm() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const lastSaved = useRef(0)
    const pendingPosition = useRef<number | null>(null)
    const [quality, setQuality] = useState<'1080' | '720'>('1080')
    const [started, setStarted] = useState(false)
    const [failed, setFailed] = useState(false)
    const [waiting, setWaiting] = useState(false)
    const [resumed, setResumed] = useState(false)

    function save() {
        const video = videoRef.current
        if (!video || !Number.isFinite(video.duration)) return
        try {
            localStorage.setItem(
                KEY,
                String(pendingPosition.current ?? (video.ended ? 0 : video.currentTime)),
            )
        } catch {
            /* Private mode must not interrupt playback. */
        }
    }

    useEffect(() => {
        const video = videoRef.current
        const persist = () => {
            if (video && Number.isFinite(video.duration)) {
                try {
                    localStorage.setItem(
                        KEY,
                        String(pendingPosition.current ?? (video.ended ? 0 : video.currentTime)),
                    )
                } catch {
                    /* Storage can be unavailable. */
                }
            }
        }
        const onHidden = () => {
            if (document.hidden) {
                persist()
                video?.pause()
            }
        }
        window.addEventListener('pagehide', persist)
        document.addEventListener('visibilitychange', onHidden)
        return () => {
            persist()
            video?.pause()
            video?.removeAttribute('src')
            video?.load()
            window.removeEventListener('pagehide', persist)
            document.removeEventListener('visibilitychange', onHidden)
        }
    }, [])

    async function play() {
        setFailed(false)
        setStarted(true)
        // Mounting the source triggers metadata; playback still follows an explicit user action.
        const video = videoRef.current
        if (video) {
            if (!video.getAttribute('src') || video.error) {
                video.src = SOURCES[quality]
                video.load()
            }
            try {
                await video.play()
            } catch {
                if (video.error) setFailed(true)
            }
        }
    }

    async function changeQuality(next: '1080' | '720') {
        setQuality(next)
        const video = videoRef.current
        if (!started || !video) return
        save()
        if (pendingPosition.current === null && video.readyState >= 1)
            pendingPosition.current = video.currentTime
        const continuePlaying = !video.paused
        video.pause()
        setFailed(false)
        setWaiting(continuePlaying)
        video.src = SOURCES[next]
        video.load()
        if (continuePlaying) {
            try {
                await video.play()
            } catch {
                if (video.error) setFailed(true)
            }
        }
    }

    return (
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 md:py-10 text-[#0F1B33] space-y-6">
            {/* KHỐI TIÊU ĐỀ & BỘ CHỌN CHẤT LƯỢNG PHIM */}
            <div className="bg-white border-2 border-[#0275FB]/15 rounded-[2.2rem] p-6 sm:p-8 shadow-[0_18px_45px_rgba(2,117,251,0.07)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0275FB] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FDC908] ring-4 ring-[#FFF2C3]" />
                        <span>Điện ảnh · Địa đạo Củ Chi</span>
                    </p>
                    <h1 className="text-2xl sm:text-4xl font-black text-[#0F1B33] tracking-tight">
                        Câu chuyện dưới lòng đất
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                        Khám phá địa đạo Củ Chi qua phim dựng 3D. 11 phút 03 giây · 1080p nâng cấp từ bản nguồn 720p.
                    </p>
                </div>

                {/* Bộ chọn độ phân giải */}
                <div className="shrink-0">
                    <label className="flex flex-wrap items-center gap-3 p-3 sm:px-4 rounded-2xl bg-[#F4F9FF] border-2 border-[#0275FB]/20 text-xs sm:text-sm font-black text-[#0F1B33]">
                        <span className="flex items-center gap-1.5 text-[#0275FB]">
                            <MaterialIcon name="hd" className="text-lg text-[#FDC908]" />
                            <span>Chất lượng</span>
                        </span>
                        <select
                            value={quality}
                            onChange={(event) =>
                                void changeQuality(event.target.value as '1080' | '720')
                            }
                            className="rounded-xl border border-[#0275FB]/30 bg-white px-3.5 py-2 text-xs sm:text-sm font-black text-[#0F1B33] shadow-2xs cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0275FB]"
                        >
                            <option value="1080">Full HD 1080p · Nâng cấp</option>
                            <option value="720">HD 720p · Nhẹ hơn</option>
                        </select>
                    </label>
                </div>
            </div>

            {/* SÂN KHẤU TRÌNH CHIẾU ĐIỆN ẢNH 3D */}
            <div className="rounded-[2.2rem] bg-gradient-to-b from-[#07132C] via-[#0E224D] to-[#033980] p-3 sm:p-5 border-2 border-[#FDC908] shadow-[0_22px_55px_rgba(15,27,51,0.22)] relative">
                {/* 4 góc định vị màn ảnh */}
                <div className="hidden sm:block absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#FDC908]/70 rounded-tl-lg pointer-events-none" />
                <div className="hidden sm:block absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#FDC908]/70 rounded-tr-lg pointer-events-none" />
                <div className="hidden sm:block absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#FDC908]/70 rounded-bl-lg pointer-events-none" />
                <div className="hidden sm:block absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#FDC908]/70 rounded-br-lg pointer-events-none" />

                <div className="relative overflow-hidden rounded-[1.6rem] border border-white/15 bg-black shadow-2xl">
                    <video
                        ref={videoRef}
                        controls={started}
                        controlsList="nodownload"
                        onContextMenu={(event) => event.preventDefault()}
                        playsInline
                        preload="none"
                        poster="/films/cu-chi-film-poster-v1.png"
                        aria-label="Phim 3D về địa đạo Củ Chi"
                        className="aspect-video w-full block"
                        onLoadedMetadata={() => {
                            const video = videoRef.current
                            if (!video) return
                            try {
                                const position =
                                    pendingPosition.current === null
                                        ? resumePosition(localStorage.getItem(KEY), video.duration)
                                        : switchPosition(pendingPosition.current, video.duration)
                                pendingPosition.current = null
                                if (position) video.currentTime = position
                                setResumed(position > 0)
                            } catch {
                                /* Playback works without saved progress. */
                            }
                        }}
                        onTimeUpdate={() => {
                            if (Date.now() - lastSaved.current > 5000) {
                                save()
                                lastSaved.current = Date.now()
                            }
                        }}
                        onPause={save}
                        onEnded={() => {
                            save()
                            setResumed(false)
                        }}
                        onWaiting={() => setWaiting(true)}
                        onPlaying={() => {
                            setWaiting(false)
                            setFailed(false)
                        }}
                        onCanPlay={() => setWaiting(false)}
                        onError={() => {
                            setFailed(true)
                            setWaiting(false)
                        }}
                    />

                    {!started && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-[#07132C]/85 via-[#07132C]/45 to-transparent p-6 text-center">
                            <button
                                type="button"
                                onClick={() => void play()}
                                className="rounded-full bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] px-8 py-4 text-base sm:text-lg font-black text-[#0F1B33] shadow-[0_12px_32px_rgba(253,201,8,0.5)] hover:scale-105 hover:brightness-105 transition-all cursor-pointer focus-visible:outline-4 focus-visible:outline-white"
                            >
                                ▶ Xem phim
                            </button>
                            <span className="mt-3 px-3.5 py-1 rounded-full bg-[#0F1B33]/80 border border-white/20 text-[11px] font-bold text-[#FFF2C3] backdrop-blur-md">
                                Bản dựng 3D · Có thuyết minh âm thanh
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* THANH TRẠNG THÁI PHÁT & NÚT XEM LẠI TỪ ĐẦU */}
            <div className="bg-white border-2 border-[#0275FB]/15 rounded-2xl p-4 sm:px-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div
                    aria-live="polite"
                    className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2.5"
                >
                    <span className="w-8 h-8 rounded-xl bg-[#EAF3FF] text-[#0275FB] flex items-center justify-center shrink-0">
                        <MaterialIcon
                            name={failed ? 'error' : waiting ? 'hourglass_top' : 'info'}
                            className="text-lg"
                        />
                    </span>
                    {failed ? (
                        <p className="text-rose-700">
                            Chưa tải được phim. Kiểm tra kết nối rồi{' '}
                            <button
                                type="button"
                                onClick={() => void play()}
                                className="underline font-black text-[#0275FB] cursor-pointer"
                            >
                                thử lại
                            </button>
                            .
                        </p>
                    ) : waiting ? (
                        <p className="text-[#0275FB]">Đang tải thêm phim…</p>
                    ) : resumed ? (
                        <p className="text-emerald-700">
                            Đã tiếp tục từ vị trí xem gần nhất trên thiết bị này.
                        </p>
                    ) : (
                        <p>
                            Bấm xem để tải phim. Bạn có thể tua, đổi tốc độ và mở toàn màn hình trong trình phát.
                        </p>
                    )}
                </div>

                {started && (
                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FFF2C3] border border-[#FDC908] text-xs sm:text-sm font-black text-[#0F1B33] underline cursor-pointer transition-colors"
                        onClick={() => {
                            pendingPosition.current =
                                videoRef.current && videoRef.current.readyState >= 1 ? null : 0
                            if (videoRef.current && videoRef.current.readyState >= 1)
                                videoRef.current.currentTime = 0
                            setResumed(false)
                            save()
                        }}
                    >
                        Xem lại từ đầu
                    </button>
                )}
            </div>
        </div>
    )
}