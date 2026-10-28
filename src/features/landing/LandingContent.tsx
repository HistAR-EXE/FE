// src/features/landing/LandingContent.tsx
import { useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import './landing-content.css'
import { ChronoFaq } from './ChronoFaq'
import { PilotTunnelPreview } from './PilotTunnelPreview'

const experiences = [
    {
        label: 'Cổng Thời Gian',
        icon: '◷',
        tag: '01 / XUYÊN QUA BỐN CHƯƠNG',
        title: 'Cùng một nơi. Bốn lát cắt thời gian.',
        text: 'Đi từ 1948, qua 1968 và 1975 đến hiện nay. Theo dấu câu chuyện, giải câu đố và đối chiếu 5 điểm Xưa & Nay tại Củ Chi.',
        image: '/images/landing/features-v1/portal.png',
        caption: 'Cổng Thời Gian — hành trình qua bốn chương lịch sử',
        route: `/time-portal/${CU_CHI_LOCATION_ID}`,
        cta: 'Bước vào Cổng Thời Gian',
        chips: ['4 mốc lịch sử', '5 điểm Xưa & Nay'],
    },
    {
        label: 'Tái hiện lịch sử',
        icon: '◇',
        tag: '02 / NHÌN LỊCH SỬ CHUYỂN ĐỘNG',
        title: 'Một góc nhìn rộng hơn về Củ Chi.',
        text: 'Khám phá sa bàn tương tác và bộ phim 3D dài 11 phút 03 giây. Chọn chất lượng phù hợp và tiếp tục hành trình xem của bạn.',
        image: '/images/landing/features-v1/history.png',
        caption: 'Tái hiện lịch sử — sa bàn tương tác và phim 3D',
        route: `/diorama/${CU_CHI_LOCATION_ID}`,
        cta: 'Mở sa bàn & phim 3D',
        chips: ['Sa bàn tương tác', 'Phim 11:03'],
    },
    {
        label: 'Tham quan 360°',
        icon: '⊕',
        tag: '03 / ĐỔI GÓC NHÌN, MỞ KHÔNG GIAN',
        title: 'Chạm để xoay. Dừng để khám phá.',
        text: 'Quan sát không gian di tích theo nhiều hướng, di chuyển giữa các góc nhìn và tìm những điểm tương tác trong tour 360°.',
        image: '/images/landing/features-v1/tour.png',
        caption: 'Tham quan 360° — khám phá không gian di tích',
        route: `/tour/360/${CU_CHI_LOCATION_ID}`,
        cta: 'Bắt đầu tour 360°',
        chips: ['Kéo để quan sát', 'Điểm tương tác'],
    },
    {
        label: 'AR & bảo tàng 3D',
        icon: '⌗',
        tag: '04 / DI SẢN TRONG MỘT GÓC NHÌN MỚI',
        title: 'Xoay một hiện vật. Mở một câu chuyện.',
        text: 'Khám phá 10 mô hình trong bộ AR chính thức. Xem mô hình trên web hoặc dùng camera nhận diện ảnh mục tiêu theo hướng dẫn để trải nghiệm AR.',
        image: '/images/landing/features-v1/ar.png',
        caption: 'Khám phá AR — mô hình 3D tương tác',
        route: '/ar-experience',
        cta: 'Khám phá bộ sưu tập AR',
        chips: ['10 mô hình AR', 'Nhận diện ảnh mục tiêu'],
    },
    {
        label: 'Trợ lý lịch sử AI',
        icon: '✧',
        tag: '05 / BẮT ĐẦU BẰNG MỘT CÂU HỎI',
        title: 'Tò mò là khởi đầu của hiểu biết.',
        text: 'Hỏi sâu hơn về bối cảnh và những câu chuyện lịch sử cùng trợ lý AI. Nguồn tham khảo hiển thị tùy luồng, tài khoản và cấu hình; hãy đối chiếu thông tin quan trọng.',
        image: '/images/landing/features-v1/ai.png',
        caption: 'Trò chuyện với trợ lý AI Chrono',
        route: '/chat',
        cta: 'Trò chuyện với trợ lý AI',
        chips: ['Hỏi theo ngữ cảnh', 'Chủ động tìm hiểu'],
    },
    {
        label: 'Nhiệm vụ & hành trình',
        icon: '⚑',
        tag: '06 / MỖI KHÁM PHÁ, MỘT DẤU ẤN',
        title: 'Mang theo những điều bạn đã khám phá.',
        text: 'Giải câu đố, khám phá các trạm, tích lũy điểm và huy hiệu. Lưu lại tiến độ trong hồ sơ và chia sẻ những dấu mốc của mình.',
        image: '/images/landing/features-v1/quests.png',
        caption: 'Nhiệm vụ — khám phá và tích lũy XP',
        route: '/quests',
        cta: 'Khám phá nhiệm vụ',
        chips: ['Câu đố & huy hiệu', 'Hành trình cá nhân'],
    },
]

export function ExperienceShowcase() {
    const [active, setActive] = useState(0)
    const [alternate, setAlternate] = useState(false)
    const buttons = useRef<(HTMLButtonElement | null)[]>([])
    const item = experiences[active]
    const related = active === 3
        ? { label: 'Bảo tàng 3D', image: '/images/landing/features-v1/museum.png', caption: 'Bảo tàng 3D — khám phá các mô hình hiện vật', route: '/artifacts' }
        : active === 5
            ? { label: 'Xếp hạng', image: '/images/landing/features-v1/leaderboard.png', caption: 'Xếp hạng — ghi nhận hành trình khám phá', route: '/leaderboard' }
            : null
    const visual = alternate && related ? related : item

    function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        let next: number
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            next = (index + 1) % experiences.length
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            next = (index + experiences.length - 1) % experiences.length
        } else if (event.key === 'Home') {
            next = 0
        } else if (event.key === 'End') {
            next = experiences.length - 1
        } else {
            return
        }
        event.preventDefault()
        setActive(next)
        setAlternate(false)
        buttons.current[next]?.focus()
    }

    return (
        <section id="experiences" className="tl-experiences tl-content-section">
            <div className="tl-container">
                <div className="tl-content-heading">
                    <div>
                        <p className="tl-eyebrow">
                            <span className="tl-live-dot" /> KHÔNG CHỈ ĐỌC VỀ LỊCH SỬ
                        </p>
                        <h2 className="tl-section-title tl-single-line-title">
                            Tự mình bước vào
                            {' '}
                            <em>câu chuyện.</em>
                        </h2>
                    </div>
                    <p>
                        Sáu cách khám phá. Một hành trình kết nối quá khứ với bạn, ngay trong
                        trình duyệt.
                    </p>
                </div>

                <div
                    className="tl-experience-tabs"
                    role="tablist"
                    aria-label="Chọn trải nghiệm TimeLens"
                >
                    {experiences.map((experience, index) => (
                        <button
                            key={experience.label}
                            type="button"
                            role="tab"
                            id={`tl-experience-tab-${index}`}
                            aria-controls={`tl-experience-panel-${index}`}
                            aria-selected={active === index}
                            tabIndex={active === index ? 0 : -1}
                            ref={(node) => {
                                buttons.current[index] = node
                            }}
                            onClick={() => { setActive(index); setAlternate(false) }}
                            onKeyDown={(event) => navigateTabs(event, index)}
                        >
                            <span aria-hidden="true">{experience.icon}</span>
                            {experience.label}
                        </button>
                    ))}
                </div>

                <div
                    className={`tl-experience-panel tl-experience-panel-${active}`}
                    role="tabpanel"
                    id={`tl-experience-panel-${active}`}
                    aria-labelledby={`tl-experience-tab-${active}`}
                    tabIndex={0}
                >
                    <figure className="tl-experience-visual tl-feature-poster">
                        <img
                            key={visual.image}
                            src={visual.image}
                            alt={visual.caption}
                            loading="lazy"
                        />
                        <figcaption className="sr-only">{visual.caption}</figcaption>
                    </figure>

                    <div className="tl-experience-copy">
                        <p className="tl-eyebrow">
                            <span className="tl-live-dot" /> {item.tag}
                        </p>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                        <div className="tl-feature-chips">
                            {item.chips.map((chip) => (
                                <span key={chip}>{chip}</span>
                            ))}
                        </div>
                        {related && <div className="tl-feature-image-switch" role="group" aria-label="Chọn ảnh giới thiệu">
                            <button type="button" aria-pressed={!alternate} onClick={() => setAlternate(false)}>{item.label}</button>
                            <button type="button" aria-pressed={alternate} onClick={() => setAlternate(true)}>{related.label}</button>
                        </div>}
                        <Link className="tl-button" to={alternate && related ? related.route : item.route}>
                            {alternate && related ? `Khám phá ${related.label}` : item.cta}
                            <span aria-hidden="true">↗</span>
                        </Link>
                        <small>Một số nội dung yêu cầu đăng nhập hoặc gói phù hợp.</small>
                    </div>
                </div>
            </div>
        </section>
    )
}

const technology = [
    {
        label: 'Không gian 3D',
        number: '01',
        title: 'Chiều sâu để nhìn. Chi tiết để hiểu.',
        text: 'Mô hình và khung cảnh 3D giúp bạn quan sát từ nhiều góc nhìn. Ánh sáng, chuyển động và tương tác biến một hình ảnh thành không gian có thể khám phá.',
        tools: 'Three.js · WebGL · GLB',
        image: '/huy/nen-sa-ban.png',
        caption: 'Nền sa bàn tái hiện',
    },
    {
        label: 'Ảnh mục tiêu & AR',
        number: '02',
        title: 'Từ một tấm ảnh, mở thêm một lớp di sản.',
        text: 'Camera nhận diện ảnh mục tiêu đã chuẩn bị để đặt mô hình theo ảnh. Làm theo hướng dẫn ảnh mẫu hoặc QR; đây không phải nhận diện tùy ý mọi hiện vật ngoài đời.',
        tools: 'MindAR · A-Frame · Camera',
        image: '/assets/ar-targets/DSCF9675.jpg',
        caption: 'Ảnh mục tiêu trong bộ AR Củ Chi',
    },
    {
        label: 'Kể chuyện số',
        number: '03',
        title: 'Công nghệ làm nền. Câu chuyện dẫn lối.',
        text: 'Panorama 360°, tranh tái hiện, ảnh thực địa và âm thanh mang đến những cách tiếp cận bổ sung cho nhau. Hình ảnh phục dựng được phân biệt với ảnh hiện trạng.',
        tools: 'Panorama 360° · Mỹ thuật số · Âm thanh',
        image: '/images/time-portal/era-1948-main.png',
        caption: 'Tranh tái hiện chương 1948',
    },
    {
        label: 'Tri thức & hành trình',
        number: '04',
        title: 'Kết nối câu hỏi với hành trình học hỏi.',
        text: 'Giao diện thích ứng thiết bị, hệ thống tài khoản, nhiệm vụ và lớp học giúp lưu tiến trình. AI theo ngữ cảnh và nguồn tham khảo phụ thuộc cấu hình, tuyến truy cập và tài khoản.',
        tools: 'React · TypeScript · Spring Boot · PostgreSQL',
        image: '/images/time-portal/site-tourists.jpg',
        caption: 'Khám phá tại di tích Củ Chi',
    },
]

const faqs = [
    [
        'TimeLens là gì?',
        'TimeLens là nền tảng khám phá di sản của HistAR Team, kết hợp kể chuyện lịch sử, không gian 3D, tour 360°, AR và các hoạt động tương tác. Củ Chi là điểm triển khai pilot trọng tâm.',
    ],
    [
        'Có cần cài ứng dụng không?',
        'Bạn có thể bắt đầu bằng trình duyệt web. Một số trải nghiệm cần thiết bị, trình duyệt và quyền truy cập phù hợp; không phải mọi thiết bị đều hỗ trợ camera AR.',
    ],
    [
        'Có phải đến Củ Chi mới dùng được?',
        'Không. Bạn có thể tìm hiểu từ xa qua Cổng Thời Gian, phim, sa bàn và các nội dung được hỗ trợ. Khi đến di tích, làm theo hướng dẫn QR, trạm hoặc ảnh mục tiêu để khám phá tại chỗ.',
    ],
    [
        'WebAR cần những gì?',
        'Cần kết nối HTTPS, camera được cấp quyền, thiết bị tương thích và ảnh mục tiêu theo hướng dẫn. Check-in bằng QR/GPS và nhận diện ảnh AR là các cơ chế khác nhau; GPS không được dùng để định vị dưới lòng đất.',
    ],
    [
        'Phần nào cần tài khoản hoặc gói sử dụng?',
        'Một số nội dung và tính năng lưu hành trình yêu cầu đăng nhập. Quyền truy cập phụ thuộc tài khoản, gói cá nhân hoặc tổ chức; xem trang Gói trải nghiệm để chọn quyền lợi phù hợp.',
    ],
    [
        'Tranh tái hiện có phải ảnh tư liệu không?',
        'Không. Tranh tái hiện và mô hình là cách thể hiện bối cảnh bằng mỹ thuật số. Ảnh hiện trạng ghi lại không gian ngày nay. TimeLens ghi chú loại hình ảnh để bạn phân biệt khi khám phá.',
    ],
    [
        'Thuyết minh tự động có yêu cầu gì?',
        'Tính năng được hỗ trợ tùy nội dung và thiết bị. Hãy bật âm thanh, cấp quyền khi được yêu cầu và làm theo hướng dẫn tại điểm trải nghiệm; không mặc định mọi nội dung hoạt động offline.',
    ],
    [
        'Các di tích khác đã có đầy đủ trải nghiệm chưa?',
        'Củ Chi là pilot có bộ trải nghiệm trọng tâm. Danh mục di tích giúp bạn tìm hiểu thêm các điểm đến; mức độ nội dung và tính năng ở từng nơi khác nhau, không đồng nghĩa tất cả đã có bộ trải nghiệm đầy đủ.',
    ],
]

export function LandingStorySections() {
    const [tech, setTech] = useState(0)
    const current = technology[tech]

    return (
        <>
            <section className="tl-journeys tl-content-section">
                <div className="tl-container">
                    <p className="tl-eyebrow">
                        <span className="tl-live-dot" /> BẠN ĐANG Ở ĐÂU CŨNG CÓ THỂ BẮT ĐẦU
                    </p>
                    <h2 className="tl-section-title tl-single-line-title">
                        Hai cách khám phá.
                        {' '}
                        Một sợi dây <em>kết nối.</em>
                    </h2>
                    <div className="tl-journey-grid">
                        <article>
              <span className="tl-journey-symbol" aria-hidden="true">
                ⌂
              </span>
                            <p className="tl-mini-label">TỪ BẤT CỨ ĐÂU</p>
                            <h3>Mở một cửa sổ về quá khứ.</h3>
                            <p>Để trí tò mò dẫn lối, trước cả khi bạn đặt chân đến di tích.</p>
                            <ol>
                                <li>Mở TimeLens trên trình duyệt</li>
                                <li>Chọn di tích và trải nghiệm</li>
                                <li>Quan sát, tìm hiểu và đặt câu hỏi</li>
                            </ol>
                            <Link to={`/time-portal/${CU_CHI_LOCATION_ID}`}>
                                Khám phá từ xa <span aria-hidden="true">↗</span>
                            </Link>
                        </article>

                        <article>
              <span className="tl-journey-symbol" aria-hidden="true">
                ⌖
              </span>
                            <p className="tl-mini-label">NGAY TẠI DI TÍCH</p>
                            <h3>Để mỗi bước chân có câu chuyện.</h3>
                            <p>
                                Kết nối điều bạn đang nhìn thấy với những điều từng diễn ra.
                            </p>
                            <ol>
                                <li>Mở TimeLens trên điện thoại</li>
                                <li>Cấp quyền phù hợp khi cần</li>
                                <li>Theo QR, trạm hoặc ảnh mục tiêu</li>
                            </ol>
                            <Link to="/scan">
                                Mở trình quét <span aria-hidden="true">↗</span>
                            </Link>
                        </article>
                    </div>
                </div>
            </section>

            <section id="technology" className="tl-technology tl-content-section">
                <div className="tl-container">
                    <div className="tl-content-heading">
                        <div>
                            <p className="tl-eyebrow">
                                <span className="tl-live-dot" /> PHÍA SAU MỖI TRẢI NGHIỆM
                            </p>
                            <h2 className="tl-section-title tl-single-line-title">
                                Di sản lâu đời.
                                {' '}
                                <em>Góc nhìn mới.</em>
                            </h2>
                        </div>
                        <p>
                            Mỹ thuật số và công nghệ cùng mở thêm những cách để quan sát,
                            tương tác và hiểu lịch sử.
                        </p>
                    </div>

                    <div className="tl-tech-layout">
                        <div className="tl-tech-selector">
                            {technology.map((entry, index) => (
                                <button
                                    key={entry.label}
                                    type="button"
                                    onClick={() => setTech(index)}
                                    aria-pressed={tech === index}
                                    aria-controls="tl-tech-detail"
                                >
                                    <span>{entry.number}</span>
                                    {entry.label}
                                    <span aria-hidden="true">↗</span>
                                </button>
                            ))}
                        </div>

                        <div
                            className="tl-tech-detail"
                            id="tl-tech-detail"
                            aria-live="polite"
                        >
                            <figure>
                                <img
                                    src={current.image}
                                    alt={current.caption}
                                    loading="lazy"
                                />
                                <figcaption>{current.caption}</figcaption>
                            </figure>
                            <div>
                                <p className="tl-mini-label">
                                    LỚP {current.number} / KHÁM PHÁ CÔNG NGHỆ
                                </p>
                                <h3>{current.title}</h3>
                                <p>{current.text}</p>
                                <span className="tl-tech-tools">{current.tools}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="tl-pilot tl-content-section">
                <div className="tl-container tl-pilot-grid">
                    <PilotTunnelPreview />

                    <div>
                        <p className="tl-eyebrow">
                            <span className="tl-live-dot" /> ĐIỂM ĐẾN PILOT
                        </p>
                        <h2 className="tl-section-title">
                            Bắt đầu từ
                            <br />
                            <em>lòng đất Củ Chi.</em>
                        </h2>
                        <p>
                            Khám phá cấu trúc địa đạo qua mô hình lát cắt 3D: từ bếp Hoàng Cầm, trạm quân y đến sở chỉ huy và những đường hầm nối liền. Xoay mô hình, phóng to và chạm từng nhãn để tìm hiểu cuộc sống dưới lòng đất.
                        </p>
                        <div className="tl-pilot-facts">
              <span>
                <strong>04</strong>mốc lịch sử
              </span>
                            <span>
                <strong>05</strong>điểm Xưa &amp; Nay
              </span>
                            <span>
                <strong>10</strong>mô hình AR
              </span>
                        </div>
                        <Link className="tl-button" to={`/tour/360/${CU_CHI_LOCATION_ID}`}>
                            Khám phá Củ Chi <span aria-hidden="true">↗</span>
                        </Link>
                        <Link className="tl-inline-link" to="/pricing#services">
                            Giải pháp số hóa di sản →
                        </Link>
                        <small>
                            Nội dung và tính năng tại các điểm đến khác đang có mức độ hoàn
                            thiện khác nhau.
                        </small>
                    </div>
                </div>
            </section>

            <section id="audiences" className="tl-audiences tl-content-section">
                <div className="tl-container">
                    <p className="tl-eyebrow">
                        <span className="tl-live-dot" /> MỖI NGƯỜI MỘT ĐIỂM BẮT ĐẦU
                    </p>
                    <h2 className="tl-section-title">
                        Di sản chung.
                        <br />
                        <em>Hành trình của riêng bạn.</em>
                    </h2>
                    <div className="tl-audience-grid">
                        {[
                            [
                                '01',
                                'Người học & du khách',
                                'Khám phá di tích qua tour 360°, Cổng Thời Gian và mô hình 3D. Làm nhiệm vụ, tích lũy XP và lưu lại hành trình của bạn.',
                                'Bắt đầu khám phá',
                                '/explore',
                            ],
                            [
                                '02',
                                'Giáo viên & nhà trường',
                                'Tạo lớp học, giao nhiệm vụ khám phá lịch sử và theo dõi tiến trình học sinh. Chọn gói phù hợp với quy mô và quyền sử dụng của nhà trường.',
                                'Xem gói dành cho nhà trường',
                                '/pricing#b2b',
                            ],
                            [
                                '03',
                                'Đơn vị quản lý di tích',
                                'Cùng HistAR xây dựng nội dung số, tour 360° và trải nghiệm tương tác cho điểm đến. Thống nhất hạng mục triển khai theo tư liệu và nhu cầu vận hành.',
                                'Tư vấn số hóa di sản',
                                '/pricing#heritage',
                            ],
                        ].map(([number, title, text, link, route]) => (
                            <article key={number}>
                                <span>{number}</span>
                                <h3>{title}</h3>
                                <p>{text}</p>
                                <Link to={route}>
                                    {link} <span aria-hidden="true">↗</span>
                                </Link>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="tl-faq tl-content-section">
                <div className="tl-container tl-faq-grid">
                    <div>
                        <p className="tl-eyebrow">
                            <span className="tl-live-dot" /> TRƯỚC KHI BẠN BẮT ĐẦU
                        </p>
                        <h2 className="tl-section-title">
                            Một chút{' '}
                            <em>giải đáp.</em>
                        </h2>
                        <p>Những điều cần biết để chọn trải nghiệm phù hợp với bạn.</p>
                        <ChronoFaq />
                    </div>

                    <div>
                        {faqs.map(([question, answer], index) => (
                            <details key={question}>
                                <summary>
                  <span className="tl-faq-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                                    {question}
                                    <span className="tl-faq-plus" aria-hidden="true">
                    +
                  </span>
                                </summary>
                                <p>{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="tl-final-cta">
                <div className="tl-container">
                    <p className="tl-eyebrow">
                        <span className="tl-live-dot" /> QUÁ KHỨ ĐANG CHỜ MỘT GÓC NHÌN MỚI
                    </p>
                    <h2>
                        Câu chuyện tiếp theo
                        <br />
                        bắt đầu từ <em>bạn.</em>
                    </h2>
                    <div>
                        <Link className="tl-button" to="/explore">
                            Bắt đầu khám phá <span aria-hidden="true">↗</span>
                        </Link>
                        <a className="tl-button-secondary" href="#tvc">
                            Xem phim giới thiệu <span aria-hidden="true">▷</span>
                        </a>
                    </div>
                    <p className="tl-final-note">Mở trình duyệt. Mang theo trí tò mò.</p>
                </div>
                <span className="tl-final-orbit" aria-hidden="true" />
            </section>
        </>
    )
}