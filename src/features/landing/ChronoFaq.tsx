import { useState, type PointerEvent } from 'react'
import './chrono-faq.css'

const tips = [
    'Bạn muốn bắt đầu từ đâu? Chọn một câu hỏi bên cạnh nhé!',
    'Bạn có thể khám phá TimeLens từ xa, ngay trên trình duyệt.',
    'Trải nghiệm AR? Hãy chuẩn bị thiết bị tương thích và làm theo hướng dẫn ảnh mục tiêu.',
    'Muốn tìm hiểu sâu hơn? Mở Cổng Thời Gian và đi qua bốn chương lịch sử Củ Chi.',
]

export function ChronoFaq() {
    const [tip, setTip] = useState(0)
    const move = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const rect = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.setProperty('--chrono-x', `${(event.clientX - rect.left - rect.width / 2) / 35}deg`)
        event.currentTarget.style.setProperty('--chrono-y', `${(event.clientY - rect.top - rect.height / 2) / -35}deg`)
    }
    return <div className="tl-chrono-faq">
        <div className="tl-chrono-bubble" aria-live="polite"><strong>Chrono mách bạn</strong><p>{tips[tip]}</p></div>
        <button type="button" className="tl-chrono-character" aria-label="Chạm vào Chrono để xem gợi ý tiếp theo" onClick={() => setTip(value => (value + 1) % tips.length)} onPointerMove={move} onPointerLeave={event => { event.currentTarget.style.setProperty('--chrono-x', '0deg'); event.currentTarget.style.setProperty('--chrono-y', '0deg') }}>
            <span className="tl-chrono-halo" aria-hidden="true" />
            <span className="tl-chrono-spark spark-one" aria-hidden="true">✦</span>
            <span className="tl-chrono-spark spark-two" aria-hidden="true">✧</span>
            <img src="/images/landing/chrono-faq-v1.png" alt="Chrono đang suy nghĩ với dấu hỏi, sẵn sàng giúp bạn khám phá TimeLens" width="1376" height="1152" loading="lazy" />
        </button>
        <p className="tl-chrono-hint">Chạm vào Chrono để nhận thêm gợi ý ✦</p>
    </div>
}
