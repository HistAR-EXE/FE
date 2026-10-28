// src/features/time-portal/TimelineExplorerView.tsx
// "Hành trình xuyên thời gian" — mỗi mốc là một chương kể chuyện:
// các khoảnh khắc tự chạy, ảnh tư liệu hiển thị trọn vẹn trong khung,
// tranh minh hoạ động, "Bạn có biết?", số liệu chạy, sơ đồ mạng lưới,
// câu đố cuối chương, thuyết minh giọng nói và hiệu ứng du hành khi chuyển mốc.
//
// Bố cục dạng lưới để các khối không bao giờ đè lên nhau:
//   • ≥1280px: [tiêu đề + thẻ] [ảnh] [số liệu]
//   • 1024–1279px: [tiêu đề + thẻ] [ảnh] — số liệu mở bằng nút
//   • <1024px: tiêu đề / ảnh / thẻ xếp dọc

import './portalExperience.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { getEraData } from './cuChiEraData'
import { ERA_VALUES, eraTimelineLabel, type EraValue } from './eraLabels'
import { ChapterRail } from './timeline/ChapterRail'
import { EraInsights } from './timeline/EraInsights'
import { PhotoLightbox, PhotoStage } from './timeline/PhotoStage'
import { StoryBackdrop } from './timeline/StoryBackdrop'
import { StoryCard } from './timeline/StoryCard'
import { TimeWarp } from './timeline/TimeWarp'
import { ERA_STORIES, type StoryVisual } from './timeline/storyData'
import type { usePortalAudio } from './timeline/usePortalAudio'
import { PortalAudioControls } from './timeline/PortalAudioControls'
import { XUA_NAY_SPOTS, type XuaNaySpotId } from './xuaNay/xuaNayData'

type Props = {
  audio: ReturnType<typeof usePortalAudio>
  suspended?: boolean
  initialEra?: EraValue
  isPremium?: boolean
  onPremiumRequired?: (era: EraValue) => void
  onSwitchTo3D?: () => void
  render3D?: (era: EraValue) => ReactNode
  /** Mở "Xưa & Nay" tại điểm gắn với khoảnh khắc (kèm id khoảnh khắc để quay lại đúng chỗ). */
  onOpenXuaNay?: (spot: XuaNaySpotId, momentId: string) => void
  /** Mở lại đúng khoảnh khắc này (ví dụ khi quay về từ "Xưa & Nay"). */
  initialMomentId?: string
  /** Báo mốc đang xem cho trang cha (để chế độ 3D mở đúng mốc). */
  onEraChange?: (era: EraValue) => void
  /** Người dùng đã xem hết các khoảnh khắc của một chương (tới slide câu đố). */
  onChapterFinished?: (era: EraValue) => void
}

type Photo = Extract<StoryVisual, { kind: 'photo' }>

const QUIZ_KEY = 'histar.timePortal.quiz.v1'
type Answers = Partial<Record<EraValue, number>>

function loadAnswers(): Answers {
  try {
    const raw = localStorage.getItem(QUIZ_KEY)
    return raw ? (JSON.parse(raw) as Answers) : {}
  } catch {
    return {}
  }
}

function saveAnswers(a: Answers) {
  try {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(a))
  } catch {
    /* bộ nhớ trình duyệt bị chặn — bỏ qua */
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** Thời lượng mỗi khoảnh khắc theo độ dài nội dung. */
function readingMs(text: string) {
  return Math.min(16000, Math.max(8500, 4200 + text.length * 42))
}

const TOOL_BTN =
  'flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

export function TimelineExplorerView({
  audio,
  suspended = false,
  initialEra,
  isPremium = true,
  onPremiumRequired,
  onSwitchTo3D,
  render3D,
  onOpenXuaNay,
  initialMomentId,
  onEraChange,
  onChapterFinished,
}: Props) {
  const [era, setEra] = useState<EraValue>(initialEra ?? 1948)
  useEffect(() => {
    if (!isPremium && era !== 2026) { setEra(2026); onEraChange?.(2026) }
  }, [isPremium, era, onEraChange])
  const [index, setIndex] = useState(() => {
    const i = initialMomentId ? ERA_STORIES[initialEra ?? 1948].moments.findIndex((m) => m.id === initialMomentId) : -1
    return Math.max(0, i)
  })
  const [hover, setHover] = useState(false)
  const [browsingModel, setBrowsingModel] = useState(false)
  const modelSectionRef = useRef<HTMLElement>(null)
  const open3D = useCallback(() => {
    if (render3D) modelSectionRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    else onSwitchTo3D?.()
  }, [render3D, onSwitchTo3D])
  const [hold, setHold] = useState(false)
  const [pageHidden, setPageHidden] = useState(false)
  const [panelsVisible, setPanelsVisible] = useState(true)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [warp, setWarp] = useState<{ from: EraValue; to: EraValue } | null>(null)
  const [answers, setAnswers] = useState<Answers>(loadAnswers)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isWide = useMediaQuery('(min-width: 1280px)')

  const story = useMemo(() => ({ ...ERA_STORIES[era], accent: '#0866d9' }), [era])
  const eraData = getEraData(era)
  const isQuiz = index >= story.moments.length
  const moment = isQuiz ? null : story.moments[index]
  const eraIdx = ERA_VALUES.indexOf(era)
  const nextEra = eraIdx < ERA_VALUES.length - 1 ? ERA_VALUES[eraIdx + 1] : null
  const durationMs = moment ? readingMs(moment.body + (moment.dyk ?? '')) : 0
  const lastMoment = story.moments[story.moments.length - 1]
  const visual = moment?.visual ?? lastMoment.visual
  const visualKey = `${era}-${(moment ?? lastMoment).id}`

  const pendingAdvance = useRef(false)
  const eraTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (eraTimer.current) clearTimeout(eraTimer.current) }, [])

  const isLocked = useCallback((e: EraValue) => !isPremium && e !== 2026, [isPremium])

  /* ---------------- Điều hướng khoảnh khắc ---------------- */

  const goNext = useCallback(() => {
    pendingAdvance.current = false
    setIndex((i) => Math.min(i + 1, story.moments.length))
  }, [story.moments.length])

  const goPrev = useCallback(() => {
    pendingAdvance.current = false
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  const jump = useCallback((i: number) => {
    pendingAdvance.current = false
    setIndex(i)
  }, [])

  const audioPaused = suspended || browsingModel || hold || pageHidden || !!warp || insightsOpen || !panelsVisible || !!lightbox
  const narrationText = moment
    ? `${story.chapter}. ${moment.date}. ${moment.title}. ${moment.body}${moment.dyk ? ` Bạn có biết? ${moment.dyk}` : ''}`
    : `Thử thách. ${story.quiz.question}`
  useEffect(() => { if (audio.ready) audio.setPaused(audioPaused) }, [audio.ready, audio.setPaused, audioPaused])
  useEffect(() => { if (audio.ready) audio.segment(`${era}-${index}`, narrationText) }, [audio.ready, audio.segment, era, index, narrationText])
  const onSegmentEnd = useCallback(() => {
    if (audio.waitingForNarration || audio.blocked) {
      pendingAdvance.current = true
      return
    }
    goNext()
  }, [goNext, audio.waitingForNarration, audio.blocked])

  useEffect(() => {
    if (pendingAdvance.current && !audio.waitingForNarration && !audio.blocked && !audioPaused && !hover) goNext()
  }, [audio.waitingForNarration, audio.blocked, audioPaused, hover, goNext])

  /* ---------------- Chuyển chương ---------------- */

  const commitEra = useCallback(
    (next: EraValue) => {
      setEra(next)
      setIndex(0)
      setInsightsOpen(false)
      onEraChange?.(next)
    },
    [onEraChange],
  )

  const requestEra = useCallback(
    (next: EraValue) => {
      if (next === era || warp) return
      if (isLocked(next)) {
        onPremiumRequired?.(next)
        return
      }
      if (prefersReducedMotion()) {
        commitEra(next)
        return
      }
      setWarp({ from: era, to: next })
      pendingAdvance.current = false
      eraTimer.current = setTimeout(() => commitEra(next), 450)
    },
    [commitEra, era, isLocked, onPremiumRequired, warp],
  )

  /* ---------------- Xem hết chương ---------------- */

  const finishedEras = useRef(new Set<EraValue>())
  useEffect(() => {
    if (!isQuiz || finishedEras.current.has(era)) return
    finishedEras.current.add(era)
    onChapterFinished?.(era)
  }, [era, isQuiz, onChapterFinished])

  /* ---------------- Câu đố ---------------- */

  const answer = (option: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [era]: option }
      saveAnswers(next)
      return next
    })
  }
  const retry = () => {
    setAnswers((prev) => {
      const next = { ...prev }
      delete next[era]
      saveAnswers(next)
      return next
    })
  }
  const isSolved = useCallback((e: EraValue) => answers[e] === ERA_STORIES[e].quiz.answer, [answers])
  const score = useMemo(() => ({ correct: ERA_VALUES.filter(isSolved).length, total: ERA_VALUES.length }), [isSolved])

  /* ---------------- Tạm dừng khi ẩn tab, phím tắt ---------------- */

  useEffect(() => {
    const onVis = () => setPageHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightbox) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()

    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, lightbox])

  const paused = audioPaused || hover || audio.blocked
  const openPhoto = (p: Photo) => setLightbox(p)

  /* Nút Xưa & Nay giữ đúng điểm và khoảnh khắc đang xem để quay lại. */
  const panelSpot: XuaNaySpotId = moment?.xuaNay ?? story.moments.find((m) => m.xuaNay)?.xuaNay ?? XUA_NAY_SPOTS[0]
  const panelXuaNay = onOpenXuaNay
    ? {
        spot: panelSpot,
        onOpen: () => {
          onOpenXuaNay(panelSpot, (moment ?? lastMoment).id)
        },
      }
    : undefined

  return (
    <div className="portal-experience relative flex h-full min-h-0 w-full flex-col bg-[#f2f7ff] text-[#142646]">
      <div className="z-20 shrink-0 border-b border-blue-100 bg-white/95 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffce22] text-blue-800 shadow-sm"><MaterialIcon name="history" className="text-2xl" /></span>
            <div><h1 className="text-lg font-black tracking-tight text-blue-700 sm:text-xl">Cổng Thời Gian</h1><p className="text-xs font-medium text-slate-500">Địa đạo Củ Chi · Hành trình qua 4 chương lịch sử</p></div>
          </div>
          <div className="flex items-center gap-2">
            {!isWide && <button type="button" onClick={() => setInsightsOpen(true)} className={TOOL_BTN}><MaterialIcon name="insights" className="text-lg" />Số liệu</button>}
            {panelXuaNay && <button type="button" onClick={panelXuaNay.onOpen} className={TOOL_BTN} aria-label="Mở Xưa & Nay tại di tích"><MaterialIcon name="compare" className="text-lg" />Xưa &amp; Nay<MaterialIcon name="arrow_forward" className="text-base" /></button>}
            <button type="button" onClick={() => setPanelsVisible((v) => !v)} className={TOOL_BTN} aria-label={panelsVisible ? 'Ẩn chữ, chỉ xem ảnh' : 'Hiện nội dung'} aria-pressed={!panelsVisible}><MaterialIcon name={panelsVisible ? 'visibility_off' : 'visibility'} className="text-lg" /></button>
          </div>
        </div>
        <PortalAudioControls audio={audio} className="mt-3" />
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto" onScroll={(event) => {
        const section = modelSectionRef.current
        if (section) setBrowsingModel(section.getBoundingClientRect().top < event.currentTarget.getBoundingClientRect().top + event.currentTarget.clientHeight * .55)
      }}>
        <StoryBackdrop story={story} visual={visual} visualKey={visualKey} durationMs={durationMs || 12000} />

        <div
          className={`relative z-10 grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:items-stretch lg:gap-x-5 lg:gap-y-3 lg:p-5 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_260px] 2xl:gap-x-7 2xl:p-7 ${
            panelsVisible ? '' : '[&_.tp-panel]:pointer-events-none [&_.tp-panel]:opacity-0'
          }`}
        >
          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          {/* Tiêu đề chương */}
          <header className="tp-panel min-w-0 transition-opacity duration-500 lg:col-start-1 lg:row-start-1">
            <div className="flex min-h-[44px] items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold border-blue-200 bg-white text-blue-700`}>
                {eraTimelineLabel(era)}
              </span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] sm:inline" style={{ color: story.accent }}>
                {story.chapter}
              </span>
            </div>
            <div className="flex items-end gap-3 lg:block">
              <p
                key={era}
                className="tp-anim shrink-0 font-black leading-none tracking-tight tabular-nums text-[40px] sm:text-[52px] lg:mt-1 lg:text-[clamp(44px,7vh,68px)]"
                style={{ color: '#0866d9', animation: 'tp-enter 600ms ease-out both' }}
              >
                {era === 2026 ? 'Hiện nay' : era}
              </p>
              <div className="min-w-0 pb-1 lg:pb-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] sm:hidden" style={{ color: story.accent }}>
                  {story.chapter}
                </span>
                <h2 className="text-base font-black text-[#142646] sm:text-xl lg:mt-1 lg:text-2xl">{eraData.title}</h2>
              </div>
            </div>
            <p className="mt-0.5 hidden text-sm text-slate-600 sm:block">{story.tagline}</p>
            <p className="mt-0.5 hidden text-xs text-slate-500 lg:block">{eraData.subtitle}</p>
            {score.correct > 0 && (
              <p className="mt-2 hidden items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 lg:inline-flex">
                <MaterialIcon name="emoji_events" className="text-sm text-amber-300" />
                Thử thách {score.correct}/{score.total}
              </p>
            )}
          </header>

          {/* Thẻ kể chuyện */}
          <div
            className="tp-panel min-w-0 transition-opacity duration-500"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            <StoryCard
              story={story}
              index={index}
              durationMs={durationMs}
              paused={paused}
              quizAnswer={answers[era]}
              score={score}
              nextChapterLabel={nextEra ? eraTimelineLabel(nextEra) : null}
              onJump={jump}
              onPrev={goPrev}
              onNext={goNext}
              onSegmentEnd={onSegmentEnd}
              onAnswer={answer}
              onRetry={retry}
              onNextChapter={() => nextEra && requestEra(nextEra)}
              onRestart={() => requestEra(ERA_VALUES[0])}
              onOpen3D={open3D}
              onOpenPhoto={visual.kind === 'photo' ? () => openPhoto(visual) : undefined}
              onOpenXuaNay={
                onOpenXuaNay && moment
                  ? (spot) => {
                      onOpenXuaNay(spot, moment.id)
                    }
                  : undefined
              }
            />
          </div>

          </div>


          {/* Ảnh tư liệu — hiển thị trọn vẹn */}
          <div className="relative min-h-[280px] min-w-0 rounded-[28px] bg-white/25 sm:min-h-[340px] lg:col-start-2 lg:row-start-1 lg:min-h-[520px] lg:h-full lg:self-stretch">
            <PhotoStage
              visual={visual}
              visualKey={visualKey}
              durationMs={durationMs || 12000}
              filter="none"
              dim={isQuiz}
              onOpen={openPhoto}
              tap={isDesktop ? undefined : { onPrev: goPrev, onNext: goNext, onHold: setHold }}
            />
          </div>

          {/* Số liệu + sơ đồ (màn hình rất rộng) */}
          {isWide && (
            <aside
              className="tp-panel min-w-0 transition-opacity duration-500 xl:col-start-3 xl:row-start-1 xl:self-start"
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
            >
              <EraInsights key={era} story={story} />
            </aside>
          )}
        </div>

        {render3D && <section ref={modelSectionRef} className="relative z-10 mx-4 mb-6 rounded-[28px] border-2 border-blue-100 bg-white p-4 shadow-sm sm:mx-5 sm:p-6" aria-labelledby="portal-model-heading">
          <header className="flex flex-wrap items-center justify-between gap-4 pb-5">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-600"><MaterialIcon name="view_in_ar" /> KHÁM PHÁ KHÔNG GIAN LỊCH SỬ</p>
              <h2 id="portal-model-heading" className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">Địa đạo 3D · {eraTimelineLabel(era)}</h2>
              <p className="mt-2 text-sm text-slate-500">Kéo để xoay · Chạm vào hầm hoặc nhãn để xem chi tiết.</p>
            </div>

          </header>
          <div className="relative h-[78dvh] min-h-[480px] sm:h-[85dvh] sm:min-h-[620px] overflow-hidden rounded-2xl bg-gradient-to-b from-sky-900 via-sky-800 to-amber-900">{render3D(era)}</div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Mô hình minh họa cấu trúc địa đạo theo thời kỳ đang chọn. Dùng thanh thời gian để tiếp tục hành trình.</p>
        </section>}

        {/* Bảng số liệu (màn hình nhỏ hơn 1280px) */}
        {insightsOpen && !isWide && (
          <div className="relative z-20 mx-4 mb-5 sm:mx-5">
            <div
              className="rounded-3xl border border-blue-100 bg-white p-4 sm:p-6"
              style={{ animation: 'tp-enter 300ms ease-out both' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-900">{story.chapter}</p>
                <button
                  type="button"
                  onClick={() => setInsightsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-blue-50"
                  aria-label="Đóng"
                >
                  <MaterialIcon name="close" className="text-xl" />
                </button>
              </div>
              <EraInsights key={era} story={story} />
            </div>
          </div>
        )}

        {warp && (
          <TimeWarp
            from={warp.from}
            to={warp.to}
            toLabel={eraTimelineLabel(warp.to)}
            chapter={ERA_STORIES[warp.to].chapter}
            accent={ERA_STORIES[warp.to].accent}
            onDone={() => setWarp(null)}
          />
        )}
      </div>

      <ChapterRail current={era} onSelect={requestEra} isLocked={isLocked} isSolved={isSolved} />

      {lightbox && <PhotoLightbox photo={lightbox} filter="none" onClose={() => setLightbox(null)} />}
    </div>
  )
}
