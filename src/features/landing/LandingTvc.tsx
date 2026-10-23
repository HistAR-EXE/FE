// src/features/landing/LandingTvc.tsx
import { useRef, useState } from 'react'
import './landing-tvc.css'

export function LandingTvc() {
    const [started, setStarted] = useState(false)
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)
    const video = useRef<HTMLVideoElement>(null)
    const pending = useRef<{ time: number; play: boolean } | null>(null)

    const start = () => {
        pending.current = { time: 0, play: true }
        setError(false)
        setLoading(true)
        setStarted(true)
        requestAnimationFrame(() => video.current?.parentElement?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    }

    const ready = () => {
        const node = video.current
        if (!node) return
        const resume = pending.current
        pending.current = null
        if (resume) {
            node.currentTime = Math.min(resume.time, Math.max(0, node.duration - 0.1))
            if (resume.play) {
                void node.play().catch(() => {
                    setLoading(false)
                })
            }
        }
    }

    return (
        <section id="tvc" className="tl-tvc" aria-labelledby="tvc-title">
            <div className="tl-container">
                {/* TIÊU ĐỀ & LỜI DẪN 2 DÒNG */}
                <div className="tl-tvc-heading">
                    <div>
                        <p className="tl-eyebrow">
                            <span className="tl-live-dot" /> 01 / BẮT ĐẦU BẰNG MỘT THƯỚC PHIM
                        </p>
                        <h2 id="tvc-title" className="tl-section-title">
                            Hai phút để hình dung.
                            <br />
                            <span>Cả hành trình để khám phá.</span>
                        </h2>
                    </div>
                    <p className="tl-tvc-lead">
                        TimeLens mang di sản đến gần bạn như thế nào?
                        <br />
                        Xem phim giới thiệu sản phẩm và cách bắt đầu trải nghiệm.
                    </p>
                </div>

                {/* KHUNG SÂN KHẤU CHIẾU PHIM (CINEMA STAGE) */}
                <div className="tl-tvc-showcase">
                    <div className="tl-tvc-stage">
                        {!started ? (
                            <button
                                type="button"
                                className="tl-tvc-poster"
                                onClick={start}
                                aria-label="Phát TVC giới thiệu TimeLens"
                            >
                                <img
                                    src="/films/timelens-tvc-thumbnail-v2.png"
                                    alt="HistAR — Khám phá giao diện TimeLens"
                                    loading="lazy"
                                    width="1920"
                                    height="1280"
                                />

                                {/* 4 góc khung ngắm điện ảnh mạ vàng */}
                                <span className="tl-tvc-bracket tl-tvc-bracket-tl" aria-hidden="true" />
                                <span className="tl-tvc-bracket tl-tvc-bracket-tr" aria-hidden="true" />
                                <span className="tl-tvc-bracket tl-tvc-bracket-bl" aria-hidden="true" />
                                <span className="tl-tvc-bracket tl-tvc-bracket-br" aria-hidden="true" />

                                {/* Huy hiệu góc trên */}
                                <span className="tl-tvc-corner">✦ HISTAR TEAM PRESENTS</span>
                                <span className="tl-tvc-duration-pill" aria-hidden="true">
                  <span className="tl-tvc-rec-dot" /> 02:38 · FULL HD
                </span>

                                {/* Nút Play trung tâm kèm hiệu ứng sóng âm đôi */}
                                <span className="tl-tvc-overlay">
                  <span className="tl-tvc-play-wrap">
                    <span className="tl-tvc-play-ring tl-tvc-play-ring-1" aria-hidden="true" />
                    <span className="tl-tvc-play-ring tl-tvc-play-ring-2" aria-hidden="true" />
                    <span className="tl-tvc-play" aria-hidden="true">
                      ▶
                    </span>
                  </span>
                  <span className="tl-tvc-cta-pill">Phát phim giới thiệu</span>
                </span>
                            </button>
                        ) : (
                            <video
                                ref={video}
                                src="/films/timelens-tvc-1080-v1.mp4"
                                controls
                                controlsList="nodownload"
                                playsInline
                                preload="metadata"
                                poster="/films/timelens-tvc-thumbnail-v2.png"
                                onContextMenu={(event) => event.preventDefault()}
                                onLoadedMetadata={ready}
                                onCanPlay={() => setLoading(false)}
                                onPlaying={() => setLoading(false)}
                                onWaiting={() => setLoading(true)}
                                onPause={() => setLoading(false)}
                                onError={() => {
                                    setError(true)
                                    setLoading(false)
                                }}
                                aria-label="TVC giới thiệu TimeLens"
                            />
                        )}

                        {started && loading && !error && (
                            <div role="status" className="tl-tvc-status">
                                Đang chuẩn bị thước phim…
                            </div>
                        )}

                        {error && (
                            <div role="alert" className="tl-tvc-error">
                                <strong>Chưa tải được TVC.</strong>
                                <p>Kiểm tra kết nối rồi thử tải lại video.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError(false)
                                        setLoading(true)
                                        pending.current = {
                                            time: video.current?.currentTime || 0,
                                            play: true,
                                        }
                                        video.current?.load()
                                    }}
                                >
                                    Thử lại
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </section>
    )
}