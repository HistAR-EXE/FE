import { useEffect } from 'react'
import { PublicFooter } from '../components/layout/PublicFooter'
import { emitEvent } from '../lib/pilotEvents'
import { LandingHeader } from '../features/landing/LandingHeader'
import { LandingHero } from '../features/landing/LandingHero'
import { LandingTvc } from '../features/landing/LandingTvc'
import { ExperienceShowcase, LandingStorySections } from '../features/landing/LandingContent'
import '../features/landing/landing.css'

export function OnboardingPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'TimeLens - Đi Cùng Di Sản'
    if (!window.location.hash) window.scrollTo(0, 0)
    try {
      if (!sessionStorage.getItem('pilot_landing_visit_sent')) {
        emitEvent('landing_visit', { payload: { path: window.location.pathname, referrer: document.referrer || null } })
        sessionStorage.setItem('pilot_landing_visit_sent', '1')
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
    return () => { document.title = previousTitle }
  }, [])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const sections = document.querySelectorAll('.tl-landing main > section:not(.tl-hero), .tl-landing .tl-content-section')
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('tl-in-view'); observer.unobserve(entry.target) }
    }), { threshold: 0.06 })
    sections.forEach(section => { section.classList.add('tl-scroll-reveal'); observer.observe(section) })
    return () => { observer.disconnect(); sections.forEach(section => section.classList.remove('tl-scroll-reveal')) }
  }, [])
  return <div className="tl-landing" id="top">
    <a className="tl-skip-link" href="#landing-main">Đi tới nội dung</a>
    <LandingHeader />
    <main id="landing-main"><LandingHero /><LandingTvc /><ExperienceShowcase /><LandingStorySections /></main>
    <PublicFooter />
    <a href="#top" className="tl-backtop" aria-label="Về đầu trang">↑</a>
  </div>
}
