import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
const TunnelScene = lazy(() => import('../time-portal/TunnelScene3D').then(module => ({ default: module.TunnelScene3D })))

export function PilotTunnelPreview() {
    const host = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        if (!host.current) return
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '200px' })
        observer.observe(host.current)
        return () => observer.disconnect()
    }, [])
    return <div className="tl-pilot-model" ref={host} aria-label="Mô hình tương tác lát cắt địa đạo Củ Chi năm 1975">
        <div className="tl-pilot-model-heading"><span>LÁT CẮT ĐỊA ĐẠO</span><span>3D TƯƠNG TÁC</span></div>
        <div className="tl-pilot-model-view">
            {visible && <Suspense fallback={<p className="tl-pilot-model-loading" role="status">Đang dựng không gian địa đạo 3D…</p>}><TunnelScene era={1975} className="tl-pilot-tunnel" /></Suspense>}
        </div>
        <div className="tl-pilot-model-caption"><p>Kéo để xoay · Cuộn hoặc chụm để thu phóng · Chạm nhãn để xem chi tiết</p><span>Mô hình minh họa cấu trúc, không theo tỷ lệ khảo cổ.</span><Link to="/time-portal/dia-dao-cu-chi">Khám phá đủ bốn thời kỳ ↗</Link></div>
    </div>
}
