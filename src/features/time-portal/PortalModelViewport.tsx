import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** Keep the WebGL scene alive only near its scroll position. */
export function PortalModelViewport({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = host.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '200px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div ref={host} className="h-full w-full">
    {visible ? children : <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">Mô hình 3D sẽ xuất hiện khi bạn cuộn đến đây.</div>}
  </div>
}
