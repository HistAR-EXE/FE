import { useEffect, useRef, useState } from 'react'

export function CuChiIntroVideo() {
    const video = useRef<HTMLVideoElement>(null)
    const visible = useRef(false)
    const [load, setLoad] = useState(false)
    const [failed, setFailed] = useState(false)
    const playIfVisible = () => {
        if (visible.current && !document.hidden) void video.current?.play().catch(() => { /* Native controls allow manual playback when autoplay is blocked. */ })
    }
    useEffect(() => {
        const node = video.current
        if (!node) return
        const observer = new IntersectionObserver(([entry]) => {
            visible.current = entry.isIntersecting && entry.intersectionRatio >= .35
            if (entry.isIntersecting) setLoad(true)
            if (visible.current && !document.hidden) void node.play().catch(() => {})
            else node.pause()
        }, { threshold: [0, .35] })
        observer.observe(node)
        const visibility = () => {
            if (document.hidden) node.pause()
            else if (visible.current) void node.play().catch(() => {})
        }
        document.addEventListener('visibilitychange', visibility)
        return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); node.pause() }
    }, [])
    useEffect(() => {
        if (!load || !video.current) return
        video.current.load()
        if (visible.current && !document.hidden) void video.current.play().catch(() => {})
    }, [load])
    return <>
        <video ref={video} className="about-cuchi-video" src={load ? '/films/cu-chi-introduction-v1.mp4' : undefined} poster="/images/cu-chi/rung-dia-dao.jpg" muted loop playsInline controls preload="none" onLoadedData={playIfVisible} onError={() => setFailed(true)} aria-label="Video giới thiệu Địa đạo Củ Chi" />
        {failed && <p className="about-cuchi-video-error" role="alert">Chưa tải được video. <a href="/films/cu-chi-introduction-v1.mp4">Mở video trực tiếp ↗</a></p>}
    </>
}
