import { useEffect, useRef, type ReactNode } from 'react'
import { LandingHeader } from '../landing/LandingHeader'
import { PublicFooter } from '../../components/layout/PublicFooter'
import '../landing/landing.css'
import './public-pages.css'

export function PublicPageShell({ title, children }: { title: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.title
    document.title = title
    const frame = requestAnimationFrame(() => {
      const target = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null
      if (target) target.scrollIntoView()
      else window.scrollTo(0, 0)
    })
    const nodes = root.current?.querySelectorAll('.pub-reveal') || []
    let observer: IntersectionObserver | undefined
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('pub-visible'); observer?.unobserve(entry.target) }
      }), { threshold: .06 })
      nodes.forEach(node => { node.classList.add('pub-observed'); observer?.observe(node) })
    }
    return () => { document.title = previous; cancelAnimationFrame(frame); observer?.disconnect(); nodes.forEach(node => node.classList.remove('pub-observed')) }
  }, [title])
  return <div ref={root} className="tl-landing tl-public" id="top">
    <a className="tl-skip-link" href="#public-main">Đi tới nội dung</a>
    <LandingHeader />
    <main id="public-main">{children}</main>
    <PublicFooter />
    <a href="#top" className="tl-backtop" aria-label="Về đầu trang">↑</a>
  </div>
}
