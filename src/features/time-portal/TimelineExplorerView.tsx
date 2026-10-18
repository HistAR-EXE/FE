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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { eraBadgeClass } from '../../shared/ui/eraBadge'
import { getEraData } from './cuChiEraData'
import { ERA_VALUES, eraTimelineLabel, type EraValue } from './eraLabels'
import { ChapterRail } from './timeline/ChapterRail'
import { EraInsights } from './timeline/EraInsights'
import { PhotoLightbox, PhotoStage } from './timeline/PhotoStage'
import { StoryBackdrop } from './timeline/StoryBackdrop'
import { StoryCard } from './timeline/StoryCard'
import { TimeWarp } from './timeline/TimeWarp'
import { ERA_STORIES, type StoryVisual } from './timeline/storyData'
import { useNarration } from './timeline/useNarration'
import { XUA_NAY_SPOTS, type XuaNaySpotId } from './xuaNay/xuaNayData'

type Props = {
  initialEra?: EraValue
  isPremium?: boolean
  onPremiumRequired?: (era: EraValue) => void
  onSwitchTo3D?: () => void
  /** Mở "Xưa & Nay" tại điểm gắn với khoảnh khắc (kèm id khoảnh khắc để quay lại đúng chỗ). */
  onOpenXuaNay?: (spot: XuaNaySpotId, momentId: string) => void
  /** Mở lại đúng khoảnh khắc này (ví dụ khi quay về từ "Xưa & Nay"). */
  initialMomentId?: string
  /** Báo mốc đang xem cho trang cha (để chế độ 3D mở đúng mốc). */
  onEraChange?: (era: EraValue) => void
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
  'flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-black/55 px-3 text-xs text-white/85 backdrop-blur-sm transition-colors hover:bg-black/75'

export function TimelineExplorerView({
  initialEra,
  isPremium = true,
  onPremiumRequired,
  onSwitchTo3D,
  onOpenXuaNay,
  initialMomentId,
  onEraChange,
}: Props) {
  const [era, setEra] = useState<EraValue>(initialEra ?? 2026)
  const [index, setIndex] = useState(() => {
    const i = initialMomentId ? ERA_STORIES[initialEra ?? 2026].moments.findIndex((m) => m.id === initialMomentId) : -1
    return Math.max(0, i)
  })
  const [playing, setPlaying] = useState(true)
  const [hover, setHover] = useState(false)
  const [hold, setHold] = useState(false)
  const [pageHidden, setPageHidden] = useState(false)
  const [panelsVisible, setPanelsVisible] = useState(true)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [warp, setWarp] = useState<{ from: EraValue; to: EraValue } | null>(null)
  const [answers, setAnswers] = useState<Answers>(loadAnswers)
  const [narrate, setNarrate] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isWide = useMediaQuery('(min-width: 1280px)')

  const story = ERA_STORIES[era]
  const eraData = getEraData(era)
  const isQuiz = index >= story.moments.length
  const moment = isQuiz ? null : story.moments[index]
  const eraIdx = ERA_VALUES.indexOf(era)
  const nextEra = eraIdx < ERA_VALUES.length - 1 ? ERA_VALUES[eraIdx + 1] : null
  const durationMs = moment ? readingMs(moment.body + (moment.dyk ?? '')) : 0
  const lastMoment = story.moments[story.moments.length - 1]
  const visual = moment?.visual ?? lastMoment.visual
  const visualKey = `${era}-${(moment ?? lastMoment).id}`

  const narration = useNarration()
  const stopNarration = narration.stop
  const pendingAdvance = useRef(false)

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

  const onSegmentEnd = useCallback(() => {
    if (narrate && narration.speakingRef.current) {
      pendingAdvance.current = true
      return
    }
    goNext()
  }, [goNext, narrate, narration.speakingRef])

  /* ---------------- Chuyển chương ---------------- */

  const commitEra = useCallback(
    (next: EraValue) => {
      setEra(next)
      setIndex(0)
      setPlaying(true)
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
      stopNarration()
      if (prefersReducedMotion()) {
        commitEra(next)
        return
      }
      setWarp({ from: era, to: next })
      window.setTimeout(() => commitEra(next), 450)
    },
    [commitEra, era, isLocked, onPremiumRequired, stopNarration, warp],
  )

  /* ---------------- Thuyết minh ---------------- */

  const speakCurrent = useCallback(() => {
    const text = moment ? `${moment.title}. ${moment.body}` : `Thử thách. ${story.quiz.question}`
    narration.speak(text, () => {
      if (pendingAdvance.current) goNext()
    })
  }, [goNext, moment, narration, story.quiz.question])

  useEffect(() => {
    if (narrate && !warp) speakCurrent()
    // chỉ đọc lại khi đổi khoảnh khắc / chương
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrate, era, index, warp])

  const toggleNarration = () => {
    if (narrate) {
      stopNarration()
      setNarrate(false)
    } else {
      setNarrate(true)
      setPlaying(true)
    }
  }

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
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === ' ' && t?.tagName !== 'BUTTON') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, lightbox])

  const paused = !playing || hover || hold || pageHidden || !!warp || insightsOpen || !panelsVisible || !!lightbox
  const openPhoto = (p: Photo) => setLightbox(p)

  /* Lối vào "Xưa & Nay" ở bảng số liệu: ưu tiên điểm của khoảnh khắc đang xem, rồi điểm đầu tiên của chương. */
  const panelSpot: XuaNaySpotId = moment?.xuaNay ?? story.moments.find((m) => m.xuaNay)?.xuaNay ?? XUA_NAY_SPOTS[0]
  const panelXuaNay = onOpenXuaNay
    ? {
        spot: panelSpot,
        onOpen: () => {
          stopNarration()
          onOpenXuaNay(panelSpot, (moment ?? lastMoment).id)
        },
      }
    : undefined

  return (
    <div className="relative flex h-full w-full flex-col bg-black">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <StoryBackdrop story={story} visual={visual} visualKey={visualKey} durationMs={durationMs || 12000} />

        <div
          className={`relative z-10 grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 p-3 sm:gap-3 sm:p-4 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-6 lg:gap-y-4 lg:p-6 xl:grid-cols-[minmax(380px,480px)_minmax(0,1fr)_300px] ${
            panelsVisible ? '' : '[&>.tp-panel]:pointer-events-none [&>.tp-panel]:opacity-0'
          }`}
        >
          {/* Tiêu đề chương */}
          <header className="tp-panel min-w-0 transition-opacity duration-500 lg:col-start-1 lg:row-start-1">
            <div className="flex min-h-[44px] items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${eraBadgeClass(era)}`}>
                {eraTimelineLabel(era)}
              </span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] sm:inline" style={{ color: story.accent }}>
                {story.chapter}
              </span>
            </div>
            <div className="flex items-end gap-3 lg:block">
              <p
                key={era}
                className="tp-anim shrink-0 font-black leading-none tracking-tight tabular-nums text-[40px] sm:text-[56px] lg:mt-1 lg:text-[clamp(48px,8.5vh,76px)]"
                style={{
                  backgroundImage: `linear-gradient(180deg, #ffffff 35%, ${story.accent})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.55))',
                  animation: 'tp-enter 600ms ease-out both',
                }}
              >
                {era === 2026 ? 'Hiện nay' : era}
              </p>
              <div className="min-w-0 pb-1 lg:pb-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] sm:hidden" style={{ color: story.accent }}>
                  {story.chapter}
                </span>
                <h2 className="truncate text-base font-bold text-white drop-shadow-lg sm:text-xl lg:mt-1 lg:text-2xl">{eraData.title}</h2>
              </div>
            </div>
            <p className="mt-0.5 hidden text-sm text-white/75 drop-shadow sm:block">{story.tagline}</p>
            <p className="mt-0.5 hidden text-xs text-white/50 lg:block">{eraData.subtitle}</p>
            {score.correct > 0 && (
              <p className="mt-2 hidden items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm lg:inline-flex">
                <MaterialIcon name="emoji_events" className="text-sm text-amber-300" />
                Thử thách {score.correct}/{score.total}
              </p>
            )}
          </header>

          {/* Ảnh tư liệu — hiển thị trọn vẹn */}
          <div className="min-h-0 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-14">
            <PhotoStage
              visual={visual}
              visualKey={visualKey}
              durationMs={durationMs || 12000}
              filter={story.photoFilter}
              dim={isQuiz}
              onOpen={openPhoto}
              tap={isDesktop ? undefined : { onPrev: goPrev, onNext: goNext, onHold: setHold }}
            />
          </div>

          {/* Thẻ kể chuyện */}
          <div
            className="tp-panel tp-scroll min-h-0 max-h-[58vh] overflow-y-auto transition-opacity duration-500 lg:col-start-1 lg:row-start-2 lg:max-h-full lg:self-end"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            <StoryCard
              story={story}
              index={index}
              durationMs={durationMs}
              paused={paused}
              playing={playing}
              narration={{ supported: narration.supported, active: narrate, onToggle: toggleNarration }}
              quizAnswer={answers[era]}
              score={score}
              nextChapterLabel={nextEra ? eraTimelineLabel(nextEra) : null}
              onJump={jump}
              onPrev={goPrev}
              onNext={goNext}
              onTogglePlay={() => setPlaying((p) => !p)}
              onSegmentEnd={onSegmentEnd}
              onAnswer={answer}
              onRetry={retry}
              onNextChapter={() => nextEra && requestEra(nextEra)}
              onRestart={() => requestEra(ERA_VALUES[0])}
              onOpen3D={onSwitchTo3D}
              onHoverChange={() => undefined}
              onOpenPhoto={visual.kind === 'photo' ? () => openPhoto(visual) : undefined}
              onOpenXuaNay={
                onOpenXuaNay && moment
                  ? (spot) => {
                      stopNarration()
                      onOpenXuaNay(spot, moment.id)
                    }
                  : undefined
              }
            />
          </div>

          {/* Số liệu + sơ đồ (màn hình rất rộng) */}
          {isWide && (
            <aside
              className="tp-panel tp-scroll min-h-0 overflow-y-auto pt-14 transition-opacity duration-500 xl:col-start-3 xl:row-span-2 xl:row-start-1"
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
            >
              <EraInsights key={era} story={story} onOpen3D={onSwitchTo3D} xuaNay={panelXuaNay} />
            </aside>
          )}
        </div>

        {/* Nút công cụ */}
        <div className="absolute right-0 top-0 z-30 flex flex-nowrap items-center gap-2 p-3 sm:p-4">
          {!isWide && (
            <button type="button" onClick={() => setInsightsOpen(true)} className={TOOL_BTN} title="Số liệu & bản đồ">
              <MaterialIcon name="insights" className="text-base" />
              <span className="hidden sm:inline">Số liệu</span>
            </button>
          )}
          {onSwitchTo3D && (
            <button type="button" onClick={onSwitchTo3D} className={TOOL_BTN} title="Xem mô hình 3D địa đạo">
              <MaterialIcon name="view_in_ar" className="text-base" />
              <span className="hidden sm:inline">3D</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanelsVisible((v) => !v)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/75"
            title={panelsVisible ? 'Ẩn chữ, chỉ xem ảnh' : 'Hiện nội dung'}
          >
            <MaterialIcon name={panelsVisible ? 'visibility_off' : 'visibility'} className="text-lg" />
          </button>
        </div>

        {/* Bảng số liệu (màn hình nhỏ hơn 1280px) */}
        {insightsOpen && !isWide && (
          <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:items-end lg:justify-stretch" onClick={() => setInsightsOpen(false)}>
            <div
              className="tp-scroll max-h-[85%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-neutral-950/95 p-4 pb-6 lg:h-full lg:max-h-none lg:w-[340px] lg:rounded-none lg:border-l lg:border-t-0"
              style={{ animation: 'tp-enter 300ms ease-out both' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{story.chapter}</p>
                <button
                  type="button"
                  onClick={() => setInsightsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
                  aria-label="Đóng"
                >
                  <MaterialIcon name="close" className="text-xl" />
                </button>
              </div>
              <EraInsights key={era} story={story} onOpen3D={onSwitchTo3D} xuaNay={panelXuaNay} />
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

      {lightbox && <PhotoLightbox photo={lightbox} filter={story.photoFilter} onClose={() => setLightbox(null)} />}
    </div>
  )
}
