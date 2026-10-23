// src/features/landing/LandingHero.tsx
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'

const layers = [
    {
        label: '1948',
        title: 'Những bước đầu trong lòng đất',
        image: '/images/time-portal/era-1948-main.png',
        caption: 'Tranh tái hiện · Củ Chi năm 1948',
    },
    {
        label: '1968',
        title: 'Một thế giới dưới lòng đất',
        image: '/images/time-portal/era-1968-crawl.jpg',
        caption: 'Ảnh tư liệu: du kích phục trong địa đạo',
    },
    {
        label: '1975',
        title: 'Ngày giải phóng',
        image: '/images/time-portal/era-1975-main.png',
        caption: 'Tranh tái hiện · Củ Chi năm 1975',
    },
    {
        label: 'Hiện nay',
        title: 'Di sản vẫn đang kể chuyện',
        image: '/images/time-portal/site-forest-huts.jpg',
        caption: 'Không gian di tích Củ Chi ngày nay',
    },
]

const LandingSpatialScene = lazy(() => import('./LandingSpatialScene'))

export function LandingHero() {
    const [layer, setLayer] = useState(1)
    const [spatial, setSpatial] = useState(false)
    const closeSpatial = useCallback(() => setSpatial(false), [])
    const stage = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const node = stage.current
        if (
            !node ||
            window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches
        )
            return
        const move = (event: PointerEvent) => {
            const rect = node.getBoundingClientRect()
            node.style.setProperty(
                '--rx',
                `${(event.clientY - rect.top - rect.height / 2) / -65}deg`,
            )
            node.style.setProperty(
                '--ry',
                `${(event.clientX - rect.left - rect.width / 2) / 65}deg`,
            )
        }
        const reset = () => {
            node.style.setProperty('--rx', '0deg')
            node.style.setProperty('--ry', '0deg')
        }
        node.addEventListener('pointermove', move)
        node.addEventListener('pointerleave', reset)
        return () => {
            node.removeEventListener('pointermove', move)
            node.removeEventListener('pointerleave', reset)
        }
    }, [])

    return (
        <section className="tl-hero" aria-labelledby="landing-title">
            <div className="tl-container tl-hero-grid">
                <div className="tl-hero-copy">
                    <p className="tl-eyebrow">
                        <span className="tl-live-dot" /> DI SẢN VIỆT NAM · MỘT GÓC NHÌN MỚI
                    </p>
                    <h1 id="landing-title">
                        Lịch sử không
                        <br />
                        chỉ để đọc.
                        <br />
                        <em>Hãy bước vào.</em>
                    </h1>
                    <p className="tl-hero-description">
                        Chạm vào quá khứ. Khám phá di sản. Kết nối hôm nay.
                    </p>
                    <p className="tl-hero-intro">
                        TimeLens là nền tảng trải nghiệm di sản số của HistAR Team. Từ không gian 360°, câu chuyện lịch sử đến AR và mô hình 3D — bắt đầu trên web, tiếp nối tại di tích.
                    </p>
                    <div className="tl-hero-ctas">
                        <Link to="/explore" className="tl-button">
                            Khám phá TimeLens <span aria-hidden="true">↗</span>
                        </Link>
                        <a href="#tvc" className="tl-text-button">
              <span className="tl-small-play" aria-hidden="true">
                ▶
              </span>{' '}
                            Xem TVC <small>02:38</small>
                        </a>
                    </div>
                    <div className="tl-hero-footnote">
                        <span aria-hidden="true">◎</span> Trải nghiệm từ xa &amp; tại di tích{' '}
                        <span className="tl-footnote-separator">/</span> Bắt đầu ngay trên web
                    </div>
                </div>

                <div className="tl-hero-exhibit" ref={stage}>
                    <div className="tl-exhibit-coordinate" aria-hidden="true">
                        HISTAR / DIGITAL HERITAGE EXHIBITION / 01
                    </div>
                    <div className="tl-exhibit-orbit tl-orbit-one" />
                    <div className="tl-exhibit-orbit tl-orbit-two" />
                    <div className="tl-exhibit-frame">
                        <img
                            src={layers[layer].image}
                            alt={layers[layer].caption}
                            fetchPriority="high"
                            width="1000"
                            height="900"
                        />
                        <div className="tl-exhibit-grid" aria-hidden="true" />
                        <div className="tl-exhibit-top">
                            <span>ĐỊA ĐẠO CỦ CHI</span>
                            <span className="tl-exhibit-mark" aria-hidden="true">
                ↗
              </span>
                        </div>
                        <div className="tl-exhibit-caption">
                            <small>CỬA SỔ THỜI GIAN</small>
                            <h2>{layers[layer].title}</h2>
                            <span>{layers[layer].caption}</span>
                        </div>
                    </div>
                    <div className="tl-exhibit-tag">
                        <span aria-hidden="true">✦</span> Relive History,
                        <br />
                        <strong>Reshape Heritage.</strong>
                    </div>
                    <div
                        className="tl-exhibit-selector"
                        aria-label="Chọn lớp thời gian minh hoạ"
                    >
                        {layers.map((item, index) => (
                            <button
                                key={item.label}
                                type="button"
                                aria-pressed={layer === index}
                                onClick={() => setLayer(index)}
                            >
                                <span className="tl-selector-dot" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="tl-spatial-launch"
                        onClick={() => setSpatial(true)}
                        aria-expanded={spatial}
                    >
                        ⊞ Mở mô hình 3D
                    </button>
                    {spatial && (
                        <div className="tl-spatial-overlay">
                            <Suspense
                                fallback={
                                    <div className="tl-spatial-loading" role="status">
                                        Đang mở không gian 3D…{' '}
                                        <button type="button" onClick={closeSpatial}>
                                            Đóng
                                        </button>
                                    </div>
                                }
                            >
                                <LandingSpatialScene onClose={closeSpatial} />
                            </Suspense>
                        </div>
                    )}
                    <Link
                        to="/time-portal/dia-dao-cu-chi"
                        className="tl-exhibit-entry"
                        aria-label="Mở Cổng Thời Gian Củ Chi"
                    >
                        Mở cổng thời gian <span aria-hidden="true">↗</span>
                    </Link>
                </div>
            </div>

            <div className="tl-container tl-proof-strip">
                <p>
                    DI SẢN ĐƯỢC KỂ
                    <br />
                    <strong>BẰNG TRẢI NGHIỆM.</strong>
                </p>
                <div>
                    <strong>
                        04<span> chương</span>
                    </strong>
                    <small>Dòng thời gian Củ Chi</small>
                </div>
                <div>
                    <strong>
                        05<span> góc nhìn</span>
                    </strong>
                    <small>So sánh Xưa &amp; Nay</small>
                </div>
                <div>
                    <strong>
                        10<span> mô hình</span>
                    </strong>
                    <small>Bộ sưu tập AR chính thức</small>
                </div>
                <Link to={`/tour/360/${CU_CHI_LOCATION_ID}`}>
                    Khởi đầu tại
                    <br />
                    <strong>Củ Chi ↗</strong>
                </Link>
            </div>
        </section>
    )
}