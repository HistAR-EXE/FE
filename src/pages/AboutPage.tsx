// src/pages/AboutPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { ABOUT_PRODUCT_FEATURES as CAPABILITIES } from '../features/public-site/about-product-data'
import { CuChiIntroVideo } from '../features/public-site/CuChiIntroVideo'
import { PublicPageShell } from '../features/public-site/PublicPageShell'
import '../features/public-site/about.css'
import '../features/public-site/about-refresh.css'

const TEAM = [
    {
        name: 'Nguyễn Thái Quân',
        title: 'Chief Executive Officer (CEO)',
        short: 'CEO',
        role: 'Project Manager',
        image: '/brand/team/quan-ceo.jpg',
    },
    {
        name: 'Đặng Thuận Phát',
        title: 'Chief Technology Officer (CTO)',
        short: 'CTO',
        role: 'Full-stack Developer',
        image: '/brand/team/phat-cto.jpg',
    },
    {
        name: 'Trần Ngọc Thảo My',
        title: 'Chief Financial Officer (CFO)',
        short: 'CFO',
        role: 'Finance Analyst',
        image: '/brand/team/my-cfo.jpg',
    },
    {
        name: 'Nguyễn Quốc Huy',
        title: 'Chief Operating Officer (COO)',
        short: 'COO',
        role: 'Full-stack Developer',
        image: '/brand/team/huy-coo.jpg',
    },
    {
        name: 'Nguyễn Kỳ Vỹ',
        title: 'Chief Product Officer (CPO)',
        short: 'CPO',
        role: 'UI/UX & Graphic Designer',
        image: '/brand/team/vy-cpo.jpg',
    },
    {
        name: 'Lê Vĩnh Hảo',
        title: 'Chief Marketing Officer (CMO)',
        short: 'CMO',
        role: 'Marketing Manager',
        image: '/brand/team/hao-cmo.jpg',
    },
]

const STAGES = [
    {
        title: 'Bắt đầu từ câu hỏi',
        text: 'Làm thế nào để một câu chuyện lịch sử trở nên gần gũi hơn với người trẻ? Từ đó, HistAR xác định hướng đi kết hợp giáo dục, di sản và công nghệ.',
    },
    {
        title: 'Biến ý tưởng thành trải nghiệm',
        text: 'Xây dựng TimeLens, kết nối giao diện khám phá, nội dung tương tác, mô hình 3D và trợ lý AI trong một hành trình trên nền tảng web.',
    },
    {
        title: 'Tập trung vào Củ Chi',
        text: 'Lấy Địa đạo Củ Chi làm điểm đến pilot để hoàn thiện cách kể chuyện, rà soát nội dung và tiếp tục cải tiến trải nghiệm.',
    },
]

export const AboutPage = () => {
    const [activeCapability, setActiveCapability] = useState(0)
    const capability = CAPABILITIES[activeCapability]

    return (
        <PublicPageShell title="Về HistAR Team — TimeLens">
            <div className="about-page">
            {/* =================================================================== */}
            {/* HERO: GIỚI THIỆU HISTAR TEAM & BỨC TƯỜNG 6 NHÀ SÁNG LẬP              */}
            {/* =================================================================== */}
            <section className="about-hero pub-hero" aria-labelledby="about-title">
                <div className="tl-container about-hero-grid">
                    <div className="about-hero-copy">
                        <p className="tl-eyebrow">
                            <span className="tl-live-dot" /> HistAR Team · Những người đứng sau TimeLens
                        </p>
                        <h1 id="about-title">
                            Chúng tôi kể lại
                            <br />
                            lịch sử bằng
                            <br />
                            <span>những kết nối mới.</span>
                        </h1>
                        <p className="pub-lead">
                            HistAR Team kết hợp phát triển phần mềm, thiết kế và nội dung để xây dựng TimeLens — nền tảng khám phá di sản qua không gian 360°, mô hình 3D, câu chuyện lịch sử và tương tác AI.
                        </p>
                        <div className="about-hero-actions">
                            <a href="#team" className="tl-button">Gặp gỡ HistAR Team <MaterialIcon name="south_east" /></a>
                            <Link to="/explore" className="tl-button-secondary">Khám phá sản phẩm <MaterialIcon name="north_east" /></Link>
                        </div>
                        <div className="about-signature">
                            <img className="about-signature-logo" src="/brand/histar-about-v1.png" alt="HistAR" width="1920" height="1920" />
                            <p>
                                <strong>HistAR là đội ngũ.</strong>
                                <br />
                                TimeLens là sản phẩm chúng tôi đang xây dựng.
                            </p>
                        </div>
                    </div>

                    <div
                        className="about-collage"
                        aria-label="Sáu thành viên sáng lập HistAR Team"
                    >
                        <div className="about-collage-grid" aria-hidden="true" />
                        <div className="about-collage-orbit" aria-hidden="true" />
                        <span className="about-collage-label">THE PEOPLE / HISTAR</span>
                        {TEAM.map((member, index) => (
                            <figure
                                className={`about-portrait about-portrait-${index + 1}`}
                                key={member.short}
                            >
                                <img
                                    src={`/brand/team/des-v1/${member.short.toLowerCase()}.webp`}
                                    alt={`Poster ${member.name} — ${member.short}`}
                                    width="1200"
                                    height="1200"
                                    fetchPriority={index < 2 ? 'high' : 'auto'}
                                />
                                <figcaption>
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    {member.short}
                                </figcaption>
                            </figure>
                        ))}
                        <div className="about-collage-stamp">
                            <span>06</span>
                            <p>
                                con người
                                <br />
                                cùng một hướng đi
                            </p>
                        </div>
                        <span className="about-collage-bottom">
              HISTORY MEETS POSSIBILITY <span aria-hidden="true">↗</span>
            </span>
                    </div>
                </div>
            </section>

            {/* =================================================================== */}
            {/* 01 / NIỀM TIN: TẦM NHÌN, SỨ MỆNH & GIÁ TRỊ CỐT LÕI                  */}
            {/* =================================================================== */}
            <nav className="about-chapter-nav" aria-label="Khám phá về HistAR">
                <div className="tl-container">{[['01','Tầm nhìn & giá trị','mission'],['02','Hành trình phát triển','journey'],['03','Đội ngũ sáng lập','team'],['04','Hệ sinh thái TimeLens','ecosystem']].map(([number,label,id]) => <a href={`#${id}`} key={id}><span>{number}</span>{label}<MaterialIcon name="arrow_downward" /></a>)}</div>
            </nav>

            <section
                id="mission"
                className="pub-section about-mission pub-reveal"
                aria-labelledby="mission-title"
            >
                <div className="tl-container">
                    <div className="about-mission-heading">
                        <p className="tl-eyebrow">
                            <span className="tl-live-dot" /> 01 / Điều chúng tôi tin
                        </p>
                        <h2 id="mission-title" className="tl-section-title">
                            Gìn giữ giá trị di sản.
                            <br />
                            <span>Khơi mở cảm hứng hôm nay.</span>
                        </h2>
                    </div>

                    <div className="about-mission-grid">
                        <figure className="about-vision-image">
                            <img
                                src="/huy/vision-edtech-ar.png"
                                alt="Minh họa ý tưởng kết nối giáo dục, di sản và công nghệ AR"
                                loading="lazy"
                                width="640"
                                height="520"
                            />
                        </figure>

                        <div className="about-mission-copy">
                            <article>
                                <span>01.1 / Tầm nhìn</span>
                                <h3>Đưa di sản đến gần hơn.</h3>
                                <p>
                                    Hướng tới một nền tảng giáo dục di sản dễ tiếp cận, nơi công
                                    nghệ giúp người học tìm thấy sự gắn kết với lịch sử và văn hóa
                                    Việt Nam.
                                </p>
                            </article>
                            <article>
                                <span>01.2 / Sứ mệnh</span>
                                <h3>Mở thêm cách để hiểu lịch sử.</h3>
                                <p>
                                    HistAR xây dựng TimeLens để kết nối tư liệu, hình ảnh và trải
                                    nghiệm tương tác; khơi gợi sự tò mò trước, rồi khuyến khích
                                    mỗi người tự tìm hiểu sâu hơn.
                                </p>
                            </article>
                        </div>
                    </div>

                    <div className="about-philosophy">
                        <div className="about-philosophy-brand"><img src="/brand/histar-about-v1.png" alt="HistAR Team" width="1920" height="1920" loading="lazy" /><span>DI SẢN · GIÁO DỤC · CÔNG NGHỆ</span></div>
                        <div><p className="tl-eyebrow">TRIẾT LÝ SÁNG LẬP</p><h3>Công nghệ mở lối.<br /><em>Sự thấu hiểu tạo giá trị.</em></h3><p>TimeLens không chỉ trình bày thông tin lịch sử. Chúng tôi muốn biến việc tìm hiểu di sản thành một trải nghiệm có thể quan sát, đặt câu hỏi và chủ động khám phá — từ lớp học đến điểm tham quan.</p><p>Mỗi lựa chọn về nội dung, thiết kế và kỹ thuật cần giúp người dùng hiểu câu chuyện rõ hơn, đồng thời phù hợp với điều kiện sử dụng và vận hành thực tế.</p></div>
                    </div>
                    <div className="about-values-heading"><p className="tl-eyebrow">GIÁ TRỊ CỐT LÕI</p><h3>Những nguyên tắc dẫn dắt cách chúng tôi xây dựng.</h3></div>
                    <div className="about-values">
                        {[
                            {
                                icon: 'auto_stories',
                                title: 'Tôn trọng di sản',
                                text: 'Đặt bối cảnh và tư liệu ở trung tâm. Phân biệt rõ nội dung minh họa với thông tin lịch sử.',
                            },
                            {
                                icon: 'lightbulb',
                                title: 'Công nghệ có mục đích',
                                text: 'Chọn công nghệ vì giá trị trải nghiệm: dễ tiếp cận, có hướng dẫn và giúp câu chuyện trở nên rõ ràng.',
                            },
                            {
                                icon: 'explore',
                                title: 'Tò mò & chủ động',
                                text: 'Khuyến khích đặt câu hỏi, khám phá và học qua tương tác thay vì chỉ tiếp nhận một chiều.',
                            },
                            {
                                icon: 'verified',
                                title: 'Minh bạch & trách nhiệm',
                                text: 'Nói rõ phạm vi tính năng, nguồn tham khảo và giới hạn của AI. Tránh để hình ảnh tái hiện bị hiểu nhầm là tư liệu gốc.',
                            },
                            {
                                icon: 'accessibility_new',
                                title: 'Lấy người dùng làm trung tâm',
                                text: 'Ưu tiên nội dung dễ hiểu, chữ dễ đọc và thao tác có hướng dẫn. Cải tiến trải nghiệm theo thiết bị và bối cảnh sử dụng.',
                            },
                            {
                                icon: 'handshake',
                                title: 'Kết nối & cùng phát triển',
                                text: 'Kết hợp góc nhìn của người học, giáo viên và đơn vị quản lý di tích để nội dung số gắn với nhu cầu thực tế.',
                            },
                        ].map((value) => (
                            <article key={value.title}>
                                <MaterialIcon name={value.icon} />
                                <h3>{value.title}</h3>
                                <p>{value.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* =================================================================== */}
            {/* 02 / HÀNH TRÌNH PHÁT TRIỂN                                          */}
            {/* =================================================================== */}
            <section
                id="journey"
                className="pub-section about-journey pub-reveal"
                aria-labelledby="journey-title"
            >
                <div className="tl-container">
                    <div className="about-section-top">
                        <div>
                            <p className="tl-eyebrow">
                                <span className="tl-live-dot" /> 02 / Hành trình phát triển
                            </p>
                            <h2 id="journey-title" className="tl-section-title">
                                Từ một câu hỏi
                                <br />
                                Đến một hướng đi
                            </h2>
                        </div>
                        <p>
                            Mỗi bước phát triển là một lần chúng tôi học cách kể chuyện tốt
                            hơn, cùng với công nghệ phù hợp hơn.
                        </p>
                    </div>

                    <ol className="about-stages">
                        {STAGES.map((stage, index) => (
                            <li key={stage.title}>
                                <span className="about-stage-number">0{index + 1}</span>
                                <div>
                                    <h3>{stage.title}</h3>
                                    <p>{stage.text}</p>
                                </div>
                                <MaterialIcon name={index === 2 ? 'flag' : 'east'} />
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* =================================================================== */}
            {/* 03 / ĐỘI NGŨ SÁNG LẬP HISTAR TEAM                                   */}
            {/* =================================================================== */}
            <section
                id="team"
                className="pub-section about-team pub-reveal"
                aria-labelledby="team-title"
            >
                <div className="tl-container">
                    <div className="about-section-top">
                        <div>
                            <p className="tl-eyebrow">
                                <span className="tl-live-dot" /> 03 / Đội ngũ sáng lập
                            </p>
                            <h2 id="team-title" className="tl-section-title">
                                Những con người
                                <br />
                                đằng sau lăng kính
                            </h2>
                        </div>
                        <p>
                            Từ phát triển sản phẩm đến thiết kế và vận hành, mỗi thành viên
                            mang một góc nhìn riêng vào câu chuyện chung của HistAR.
                        </p>
                    </div>

                    <div className="about-team-grid">
                        {TEAM.map((member, index) => (
                            <article className="about-member" key={member.short}>
                                <div className="about-member-photo">
                                    <img
                                        src={`/brand/team/des-v1/${member.short.toLowerCase()}.webp`}
                                        alt={`Poster ${member.name} — ${member.short}`}
                                        loading="lazy"
                                        width="1200"
                                        height="1200"
                                    />
                                    <span className="about-member-index">0{index + 1}</span>
                                    <span className="about-member-tag">{member.short}</span>
                                </div>
                                <h3>{member.name}</h3>
                                <p className="about-member-title">{member.title}</p>
                                <p className="about-member-role">{member.role}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* =================================================================== */}
            {/* 04 / HỆ SINH THÁI SẢN PHẨM TIMELENS                                 */}
            {/* =================================================================== */}
            <section
                id="ecosystem"
                className="pub-section about-ecosystem pub-reveal"
                aria-labelledby="ecosystem-title"
            >
                <div className="tl-container">
                    <p className="tl-eyebrow">
                        <span className="tl-live-dot" /> 04 / Sản phẩm của HistAR
                    </p>
                    <div className="about-section-top">
                        <h2 id="ecosystem-title" className="tl-section-title">
                            TimeLens
                            <br />
                            Nhiều cách chạm vào lịch sử
                        </h2>
                        <p>
                            Một nền tảng web kết nối khám phá di sản, kể chuyện tương tác và
                            học tập qua trải nghiệm.
                        </p>
                    </div>

                    <div className="about-capability-layout">
                        <div
                            className="about-capability-selector"
                            role="group"
                            aria-label="Chọn trải nghiệm TimeLens"
                        >
                            {CAPABILITIES.map((item, index) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    aria-label={item.label}
                                    aria-pressed={activeCapability === index}
                                    aria-controls="about-capability-panel"
                                    onClick={() => setActiveCapability(index)}
                                >
                                    <span className="about-capability-number">0{index + 1}</span>
                                    <MaterialIcon name={item.icon} />
                                    <span>{item.label}</span>
                                    <MaterialIcon name="north_east" />
                                </button>
                            ))}
                        </div>

                        <div
                            id="about-capability-panel"
                            className="about-capability-panel"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            <div className="about-capability-image">
                                <img
                                    key={capability.image}
                                    src={capability.image}
                                    alt={capability.alt}
                                    loading="lazy"
                                    width="1000"
                                    height="1000"
                                />
                                <span>{capability.label}</span>
                            </div>
                            <div className="about-capability-copy">
                                <h3>{capability.title.match(/[^.!?]+[.!?]?/g)?.map(sentence => <span className="about-product-title-line" key={sentence}>{sentence.trim()}</span>)}</h3>
                                <p>{capability.description}</p>
                                <ul className="about-product-highlights">{capability.highlights.map(highlight => <li key={highlight}><MaterialIcon name="check_circle" />{highlight}</li>)}</ul>
                                <p className="about-capability-note">{capability.note}</p>
                                <Link to={capability.href} className="about-text-link">
                                    {capability.cta}
                                    <MaterialIcon name="east" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* =================================================================== */}
            {/* ĐIỂM ĐẾN PILOT ĐỊA ĐẠO CỦ CHI                                       */}
            {/* =================================================================== */}
            <section
                className="pub-section about-pilot pub-reveal"
                aria-labelledby="pilot-title"
            >
                <div className="tl-container about-pilot-grid">
                    <figure className="about-pilot-video-frame">
                        <CuChiIntroVideo />
                        <span className="about-pilot-photo-tag"><MaterialIcon name="location_on" /> TP. HỒ CHÍ MINH</span>
                        <figcaption className="sr-only">Video giới thiệu Địa đạo Củ Chi — tự phát tắt tiếng khi xuất hiện trong vùng xem.</figcaption>
                    </figure>
                    <div>
                        <p className="tl-eyebrow">
                            <span className="tl-live-dot" /> Bắt đầu từ một nơi chốn
                        </p>
                        <h2 id="pilot-title" className="tl-section-title">
                            Đất Thép Củ Chi
                            <br />
                            <em>Câu chuyện đầu tiên.</em>
                        </h2>
                        <p className="pub-lead">
                            Từ không gian dưới lòng đất đến những câu chuyện về cuộc sống và ý
                            chí con người, Củ Chi là điểm đến pilot của TimeLens.
                        </p>
                        <p>Theo dấu bốn thời kỳ, đối chiếu hình ảnh Xưa & Nay và khám phá hiện vật qua mô hình 3D. Mỗi trải nghiệm mở thêm một cách tìm hiểu câu chuyện của vùng đất này.</p>
                        <dl className="about-pilot-metrics">{[['04','Thời kỳ lịch sử'],['05','Điểm Xưa & Nay'],['10','Mô hình AR chính thức']].map(([value,label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                        <div className="about-pilot-actions"><Link to="/tour/360/11111111-1111-1111-1111-111111111111" className="tl-button">Khám phá Củ Chi <MaterialIcon name="north_east" /></Link><Link to="/pricing#services" className="tl-button-secondary">Giải pháp số hóa <MaterialIcon name="east" /></Link></div>
                        <p className="about-pilot-scope">Củ Chi là điểm đến pilot trọng tâm. Nội dung và tính năng tại các điểm đến khác có thể khác nhau.</p>
                    </div>
                </div>
            </section>

            {/* =================================================================== */}
            {/* TUYÊN NGÔN KẾT NỐI (MANIFESTO BANNER)                               */}
            {/* =================================================================== */}
            <section
                className="about-manifesto pub-reveal"
                aria-labelledby="manifesto-title"
            >
                <div className="tl-container">
                    <p className="tl-eyebrow">
                        <span className="tl-live-dot" /> Lời nhắn từ HistAR Team
                    </p>
                    <h2 id="manifesto-title">
                        Không chỉ nhớ một dấu mốc
                        <br />
                        <span>Hãy hiểu một câu chuyện</span>
                    </h2>
                    <p>Đó là điều chúng tôi muốn cùng bạn làm nên</p>
                    <div className="about-contact-actions">
                        <a href="mailto:histar.timelens@gmail.com" className="tl-button">
                            Kết nối với HistAR
                            <MaterialIcon name="north_east" />
                        </a>
                        <Link to="/ar-experience" className="about-text-link">
                            Trải nghiệm TimeLens
                            <MaterialIcon name="east" />
                        </Link>
                    </div>
                </div>
                <span className="about-manifesto-mark" aria-hidden="true">
          H.
        </span>
            </section>
            </div>
        </PublicPageShell>
    )
}