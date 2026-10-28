// src/features/explore/ExploreVideoLibrary.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { ExploreSnapshot } from './api'
import { exploreVideoApi, type ExploreVideo, type VideoSession } from './videoApi'
import { canSeekVideo, CU_CHI_VIDEO_IDS, formatVideoTime } from './videoState'
import { VIDEO_CONTENT } from './videoContent'
import { DISCOVERY_RECORDED_EVENT } from '../gamification/discoveryRouting'
import './exploreVideos.css'

type Props = { userId: string; onSnapshot: (snapshot: ExploreSnapshot) => void }

const mediaPath = (id: string, extension: string) => `/videos/cu-chi/${id}.${extension}`

export function ExploreVideoLibrary({ userId, onSnapshot }: Props) {
    const [videos, setVideos] = useState<ExploreVideo[]>([])
    const [selected, setSelected] = useState<string | null>(() => {
        const query = new URLSearchParams(window.location.search)
        const target = query.get('target')
        return query.get('honorsPath') === 'videos' && CU_CHI_VIDEO_IDS.some((id) => id === target)
            ? target
            : null
    })
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [retry, setRetry] = useState(0)

    useEffect(() => {
        let active = true
        exploreVideoApi
            .list()
            .then((data) => {
                if (!active) return
                setVideos(
                    CU_CHI_VIDEO_IDS.map((id) => data.videos.find((video) => video.id === id)).filter(
                        (v): v is ExploreVideo => !!v,
                    ),
                )
                setStatus('ready')
            })
            .catch(() => {
                if (active) setStatus('error')
            })
        return () => {
            active = false
        }
    }, [userId, retry])

    const current = videos.find((video) => video.id === selected)
    const completedCount = videos.filter((video) => video.completed).length

    return (
        <section id="cu-chi-videos" className="ev-library" aria-labelledby="ev-heading">
            <header className="ev-heading">
                <div>
          <span className="ev-kicker">
            <MaterialIcon name="movie" /> CỦ CHI QUA TỪNG THƯỚC PHIM
          </span>
                    <h2 id="ev-heading">Khám phá Củ Chi qua 7 video</h2>
                    <p>
                        Bảy điểm dừng, bảy góc nhìn về vùng đất thép. Xem video, khám phá kiến thức và
                        chinh phục thử thách.
                    </p>
                </div>
                <div className="ev-total">
                    <strong>
                        {completedCount}
                        <small> / 7</small>
                    </strong>
                    <span>VIDEO HOÀN THÀNH</span>
                    <b>Tổng phần thưởng · 210 XP</b>
                    <progress className="ev-total-progress" value={completedCount} max={7} aria-label="Tiến độ hoàn thành 7 video" />
                </div>
            </header>

            <p className="ev-rule">
                <MaterialIcon name="verified" /> Mỗi video: xem ít nhất 90% và trả lời đúng để nhận +30 XP
                một lần. Tiến độ được lưu theo tài khoản.
            </p>

            {status === 'loading' && <p role="status" className="ev-loading-text">Đang tải thư viện video…</p>}

            {status === 'error' && (
                <div className="ev-notice" role="alert">
                    Chưa tải được thư viện video.{' '}
                    <button
                        type="button"
                        className="ev-retry-btn"
                        onClick={() => {
                            setStatus('loading')
                            setRetry((r) => r + 1)
                        }}
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {current && (
                <VideoExperience
                    key={`${userId}:${current.id}`}
                    item={current}
                    onClose={() => setSelected(null)}
                    onProgress={(state) =>
                        setVideos((items) =>
                            items.map((v) => (v.id === current.id ? { ...v, ...state } : v)),
                        )
                    }
                    onComplete={(snapshot) => {
                        if (snapshot.profile.id === userId) onSnapshot(snapshot)
                    }}
                />
            )}

            <div className="ev-grid">
                {videos.map((video, index) => (
                    <button
                        type="button"
                        className={`ev-card ${selected === video.id ? 'is-selected' : ''} ${video.completed ? 'is-completed' : ''}`}
                        key={video.id}
                        onClick={() => setSelected(video.id)}
                        aria-pressed={selected === video.id}
                        aria-label={`${video.completed ? 'Xem lại' : 'Xem video'} ${video.title}`}
                    >
                        <div className="ev-cover">
                            <img src={mediaPath(video.id, 'jpg')} alt="" loading="lazy" />
                            <span className="ev-play">
                <MaterialIcon name="play_arrow" />
              </span>
                            <span className="ev-duration">{formatVideoTime(video.durationSeconds)}</span>
                            <span className={`ev-state ${video.completed ? 'is-done' : video.watchedSeconds > 0 ? 'is-started' : ''}`}>
                                <MaterialIcon name={video.completed ? 'check_circle' : video.watchedSeconds > 0 ? 'timelapse' : 'movie'} />
                                {video.completed ? 'Hoàn thành' : video.watchedSeconds > 0 ? 'Đang khám phá' : 'Chưa xem'}
                            </span>
                        </div>
                        <div className="ev-card-body">
              <span className="ev-card-meta">
                ĐIỂM DỪNG {String(index + 1).padStart(2, '0')} <b>{video.completed ? 'Đã nhận' : '+' + video.xp + ' XP'}</b>
              </span>
                            <h3>{video.title}</h3>
                            <p>{VIDEO_CONTENT[video.id]?.summary}</p>
                            <div className="ev-card-bottom">
                <span>
                  {video.completed
                      ? 'Xem lại câu chuyện'
                      : video.watchedSeconds > 0
                          ? `Tiếp tục từ ${formatVideoTime(video.resumeSeconds)}`
                          : 'Bắt đầu khám phá'}
                </span>
                                <MaterialIcon name="arrow_forward" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    )
}

function VideoExperience({
                             item,
                             onClose,
                             onProgress,
                             onComplete,
                         }: {
    item: ExploreVideo
    onClose: () => void
    onProgress: (state: VideoSession) => void
    onComplete: (snapshot: ExploreSnapshot) => void
}) {
    const player = useRef<HTMLVideoElement>(null)
    const region = useRef<HTMLDivElement>(null)
    const live = useRef(true)
    const generation = useRef(0)
    const session = useRef<VideoSession | null>(null)
    const busyHeartbeat = useRef(false)
    const lastPosition = useRef(0)
    const lastSent = useRef(0)

    const [state, setState] = useState<VideoSession | null>(null)
    const [error, setError] = useState('')
    const [answer, setAnswer] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [reconnect, setReconnect] = useState(0)

    const apply = useCallback(
        (next: VideoSession) => {
            if (session.current?.completed && !next.completed) return
            session.current = next
            if (!live.current) return
            setState(next)
            onProgress(next)
        },
        [onProgress],
    )
    const applyRef = useRef(apply)

    useEffect(() => {
        applyRef.current = apply
    }, [apply])

    useEffect(() => {
        live.current = true
        const epoch = ++generation.current
        region.current?.focus({ preventScroll: true })
        region.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

        void Promise.resolve()
            .then(async () => {
                if (!live.current || epoch !== generation.current) return
                const next = await exploreVideoApi.session(item.id)
                if (!live.current || epoch !== generation.current) return
                applyRef.current(next)
                if (player.current)
                    player.current.currentTime = next.completed ? 0 : next.resumeSeconds
                lastPosition.current = next.resumeSeconds
                lastSent.current = next.resumeSeconds
            })
            .catch(() => {
                if (live.current && epoch === generation.current)
                    setError('Chưa kết nối được để lưu tiến độ. Vui lòng thử lại.')
            })

        const visibility = () => {
            if (document.hidden) player.current?.pause()
        }
        document.addEventListener('visibilitychange', visibility)
        const element = player.current

        return () => {
            live.current = false
            ++generation.current
            element?.pause()
            document.removeEventListener('visibilitychange', visibility)
        }
    }, [item.id, reconnect])

    const flush = async (position = lastPosition.current) => {
        const active = session.current
        const epoch = generation.current
        if (!active || busyHeartbeat.current || active.completed) return active
        busyHeartbeat.current = true
        try {
            const next = await exploreVideoApi.heartbeat(
                item.id,
                active.sessionId,
                Math.max(0, Math.min(item.durationSeconds, position)),
            )
            if (
                live.current &&
                epoch === generation.current &&
                session.current?.sessionId === active.sessionId
            ) {
                applyRef.current(next)
                lastSent.current = position
            }
            return next
        } catch {
            if (live.current && epoch === generation.current) {
                setError(
                    'Mất kết nối lưu tiến độ. Kết nối lại để tiếp tục từ phần đã lưu.',
                )
                player.current?.pause()
            }
            return null
        } finally {
            if (epoch === generation.current) busyHeartbeat.current = false
        }
    }

    const completed = state?.completed ?? item.completed
    const ready = state?.ready || completed
    const content = VIDEO_CONTENT[item.id]

    return (
        <div className="ev-experience" ref={region} tabIndex={-1} aria-label={`Trình xem ${item.title}`}>
            <div className="ev-player-heading">
                <div>
                    <span className="ev-kicker">ĐANG KHÁM PHÁ</span>
                    <h3>{item.title}</h3>
                </div>
                <button
                    type="button"
                    className="ev-close"
                    onClick={() => {
                        player.current?.pause()
                        void flush()
                        onClose()
                    }}
                    aria-label="Đóng trình xem video"
                >
                    <MaterialIcon name="close" />
                </button>
            </div>

            <div className="ev-player-layout">
                <div>
                    <video
                        ref={player}
                        controls={!!state}
                        playsInline
                        preload="metadata"
                        poster={mediaPath(item.id, 'jpg')}
                        src={mediaPath(item.id, 'mp4')}
                        onLoadedMetadata={() => {
                            if (player.current && session.current)
                                player.current.currentTime = session.current.completed
                                    ? 0
                                    : session.current.resumeSeconds
                        }}
                        onPlay={() => {
                            if (!session.current || error) player.current?.pause()
                        }}
                        onTimeUpdate={(e) => {
                            if (e.currentTarget.seeking) return
                            lastPosition.current = e.currentTarget.currentTime
                            if (!e.currentTarget.paused && e.currentTarget.currentTime - lastSent.current >= 5) {
                                void flush()
                            }
                        }}
                        onPause={() => {
                            void flush()
                        }}
                        onEnded={() => {
                            void flush(item.durationSeconds)
                        }}
                        onSeeking={(e) => {
                            if (
                                !session.current ||
                                canSeekVideo(
                                    e.currentTarget.currentTime,
                                    session.current.watchedSeconds,
                                    completed,
                                )
                            )
                                return
                            e.currentTarget.currentTime = session.current.watchedSeconds
                            setFeedback(
                                'Hãy xem tiếp phần chưa khám phá để mở thử thách. Bạn có thể tua lại phần đã xem.',
                            )
                        }}
                        onRateChange={(e) => {
                            if (!completed && e.currentTarget.playbackRate !== 1) {
                                e.currentTarget.playbackRate = 1
                                setFeedback('Video được ghi nhận tiến độ ở tốc độ 1×.')
                            }
                        }}
                        onError={() =>
                            setError('Chưa tải được video. Hãy kiểm tra kết nối và thử lại.')
                        }
                        aria-label={`Video ${item.title}`}
                    />

                    {!state && !error && (
                        <p role="status" className="ev-status-msg">
                            <MaterialIcon name="sync" className="animate-spin" /> Đang khôi phục tiến độ xem…
                        </p>
                    )}

                    {state && (
                        <div className="ev-watch-status">
              <span>
                {completed
                    ? '✓ Đã hoàn thành · XP đã được ghi nhận'
                    : `Đã xác nhận ${Math.min(
                        100,
                        Math.floor(
                            ((state?.watchedSeconds ?? 0) / item.durationSeconds) * 100,
                        ),
                    )}% · Cần 90% để mở thử thách`}
              </span>
                            <progress
                                max={item.durationSeconds}
                                value={state?.watchedSeconds ?? 0}
                                aria-label="Tiến độ xem được xác nhận"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="ev-notice error" role="alert">
                            {error}{' '}
                            <button
                                type="button"
                                className="ev-retry-btn"
                                onClick={() => {
                                    setError('')
                                    ++generation.current
                                    busyHeartbeat.current = false
                                    session.current = null
                                    setState(null)
                                    player.current?.load()
                                    setReconnect((v) => v + 1)
                                }}
                            >
                                Kết nối lại
                            </button>
                        </div>
                    )}
                </div>

                <aside className="ev-learning">
                    <span className="ev-kicker">ĐIỀU ĐÁNG NHỚ</span>
                    <p>{content?.summary}</p>
                    <ul>
                        {content?.takeaways.map((point) => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                    <p className="ev-small">
                        Xem liền mạch ở tốc độ 1×; bạn có thể tạm dừng hoặc quay lại phần đã
                        xem. Tạm dừng trước khi đổi video để lưu phần vừa xem.
                    </p>
                </aside>
            </div>

            <div className="ev-quiz">
                <div>
                    <span className="ev-kicker">THỬ THÁCH KIẾN THỨC · +{item.xp} XP</span>
                    <h4>{ready ? item.question : 'Câu chuyện còn ở phía trước…'}</h4>
                    {!ready && (
                        <p>
                            Xem ít nhất 90% video để mở câu hỏi. Điểm chỉ được cộng khi hệ
                            thống xác nhận câu trả lời đúng.
                        </p>
                    )}
                </div>

                {ready && !completed && (
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault()
                            if (answer === null || submitting) return
                            player.current?.pause()
                            setSubmitting(true)
                            setFeedback('')
                            try {
                                const result = await exploreVideoApi.complete(item.id, answer)
                                if (!live.current) return
                                if (result.passed) {
                                    const next = { ...session.current!, completed: true, ready: true }
                                    applyRef.current(next)
                                    onComplete(result.snapshot)
                                    setFeedback(
                                        result.alreadyCompleted
                                            ? 'Bạn đã nhận XP cho video này. Xem lại không cộng thêm điểm.'
                                            : `Chính xác! +${result.xpEarned} XP đã được lưu vào hành trình.`,
                                    )
                                    window.dispatchEvent(new CustomEvent(DISCOVERY_RECORDED_EVENT))
                                } else {
                                    setFeedback(
                                        'Chưa chính xác. Hãy xem lại video và các ý kiến thức rồi thử lại.',
                                    )
                                }
                            } catch {
                                if (live.current)
                                    setFeedback(
                                        'Chưa xác nhận được kết quả. Vui lòng kiểm tra kết nối rồi gửi lại; hệ thống không cộng trùng XP.',
                                    )
                            } finally {
                                if (live.current) setSubmitting(false)
                            }
                        }}
                    >
                        <fieldset disabled={submitting}>
                            <legend className="ev-sr-only">Chọn câu trả lời</legend>
                            {item.options.map((option, i) => (
                                <label key={option} className="ev-option">
                                    <input
                                        type="radio"
                                        name={`video-${item.id}`}
                                        value={i}
                                        checked={answer === i}
                                        onChange={() => setAnswer(i)}
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </fieldset>
                        <button
                            className="ev-primary"
                            disabled={answer === null || submitting}
                        >
                            {submitting ? 'Đang xác nhận…' : 'Xác nhận đáp án · +30 XP'}
                        </button>
                    </form>
                )}

                {completed && (
                    <p className="ev-success">
                        <MaterialIcon name="check_circle" /> Bạn đã hoàn thành thử thách này. Tiếp tục khám phá những câu chuyện khác!
                    </p>
                )}
                {feedback && (
                    <p role="status" className={`ev-feedback ${feedback.includes('Chính xác') ? 'success' : 'warning'}`}>
                        {feedback}
                    </p>
                )}
            </div>
        </div>
    )
}
