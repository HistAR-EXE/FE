// src/features/time-portal/timeline/StoryCard.tsx
// Thẻ kể chuyện: thanh tiến trình kiểu "story", ngày tháng, tiêu đề, nội dung,
// "Bạn có biết?", điều khiển phát/tạm dừng/nghe; slide cuối là câu đố của chương.

import { useState } from 'react'
import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import type { XuaNaySpotId } from '../xuaNay/xuaNayData'
import type { EraStory } from './storyData'

type Props = {
  story: EraStory
  /** 0..moments.length — bằng moments.length là slide câu đố. */
  index: number
  durationMs: number
  paused: boolean
  quizAnswer: number | undefined
  score: { correct: number; total: number }
  nextChapterLabel: string | null
  onJump: (i: number) => void
  onPrev: () => void
  onNext: () => void
  onSegmentEnd: () => void
  onAnswer: (option: number) => void
  onRetry: () => void
  onNextChapter: () => void
  onRestart: () => void
  onOpen3D?: () => void
  onOpenPhoto?: () => void
  /** Mở chế độ "Xưa & Nay" tại điểm gắn với khoảnh khắc đang xem. */
  onOpenXuaNay?: (spot: XuaNaySpotId) => void
}

function IconButton({ icon, label, onClick, active, accent }: { icon: string; label: string; onClick: () => void; active?: boolean; accent?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-slate-700 transition-colors hover:bg-blue-100"
      style={active && accent ? { borderColor: accent, color: accent, background: `${accent}22` } : undefined}
    >
      <MaterialIcon name={icon} className="text-xl" />
    </button>
  )
}

export function StoryCard(props: Props) {
  const { story, index, durationMs, paused, quizAnswer, score, nextChapterLabel } = props
  const total = story.moments.length + 1
  const isQuiz = index >= story.moments.length
  const moment = isQuiz ? null : story.moments[index]
  const accent = story.accent

  return (
    <div
      className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_8px_32px_-16px_rgba(16,70,130,0.22)] backdrop-blur-xl sm:p-5"
    >
      {/* Thanh tiến trình */}
      <div className="mb-3 flex gap-1" role="tablist" aria-label="Các khoảnh khắc">
        {Array.from({ length: total }, (_, i) => {
          const done = i < index
          const current = i === index
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={current}
              aria-label={i === total - 1 ? 'Câu đố' : `Khoảnh khắc ${i + 1}`}
              onClick={() => props.onJump(i)}
              className="group relative h-4 flex-1"
            >
              <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-blue-100 group-hover:bg-blue-200">
                <span
                  key={current ? `${story.era}-${index}` : undefined}
                  className="block h-full w-full origin-left rounded-full"
                  onAnimationEnd={current ? props.onSegmentEnd : undefined}
                  style={
                    done || (current && isQuiz)
                      ? { background: accent, transform: 'scaleX(1)' }
                      : current
                        ? {
                            background: accent,
                            transform: 'scaleX(0)',
                            animation: `tp-progress ${durationMs}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running',
                          }
                        : { transform: 'scaleX(0)' }
                  }
                />
              </span>
            </button>
          )
        })}
      </div>

      {moment ? (
        <div key={`${story.era}-${moment.id}`} className="tp-anim" style={{ animation: 'tp-enter 420ms ease-out both' }}>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: `${accent}26`, color: accent }}>
              <MaterialIcon name={moment.icon} className="text-base" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>
              {moment.date}
            </span>
            <span className="ml-auto text-[11px] tabular-nums text-slate-500">
              {index + 1}/{story.moments.length}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold leading-snug text-[#142646] sm:text-xl">{moment.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700 sm:text-sm">{moment.body}</p>
          {moment.dyk && <DidYouKnow text={moment.dyk} accent={accent} />}
          {moment.xuaNay && props.onOpenXuaNay && (
            <button
              type="button"
              onClick={() => moment.xuaNay && props.onOpenXuaNay?.(moment.xuaNay)}
              className="mt-2.5 flex min-h-[36px] w-fit items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors hover:bg-blue-50"
              style={{ borderColor: `${accent}80`, color: accent }}
            >
              <MaterialIcon name="compare" className="text-base" />
              Xưa &amp; Nay tại điểm này
              <MaterialIcon name="arrow_forward" className="text-sm" />
            </button>
          )}
        </div>
      ) : (
        <QuizPanel {...props} />
      )}

      {/* Điều khiển */}
      <div className="mt-3 flex items-center gap-2">
        <IconButton icon="chevron_left" label="Khoảnh khắc trước" onClick={props.onPrev} />
        <IconButton icon="chevron_right" label="Khoảnh khắc sau" onClick={props.onNext} />
        {moment?.visual.kind === 'photo' && props.onOpenPhoto ? (
          <button
            type="button"
            onClick={props.onOpenPhoto}
            className="ml-auto flex min-h-[40px] items-center gap-1 rounded-full px-3 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-[#142646]"
          >
            <MaterialIcon name="photo_library" className="text-base" />
            Xem ảnh lớn
          </button>
        ) : (
          <p className="ml-auto min-w-0 truncate text-right text-[10px] text-slate-500">
            {moment ? moment.visual.caption : `Thử thách: ${score.correct}/${score.total} chương`}
          </p>
        )}
      </div>
      {isQuiz && quizAnswer !== undefined && (
        <div className="mt-3 flex flex-wrap gap-2">
          {nextChapterLabel ? (
            <button
              type="button"
              onClick={props.onNextChapter}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-black"
              style={{ background: accent }}
            >
              Đi tiếp: {nextChapterLabel}
              <MaterialIcon name="arrow_forward" className="text-lg" />
            </button>
          ) : (
            <button
              type="button"
              onClick={props.onRestart}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-black"
              style={{ background: accent }}
            >
              <MaterialIcon name="replay" className="text-lg" />
              Đi lại hành trình từ 1948
            </button>
          )}
          {props.onOpen3D && (
            <button
              type="button"
              onClick={props.onOpen3D}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-blue-200 px-4 text-sm font-medium text-slate-700 hover:bg-blue-50"
            >
              <MaterialIcon name="view_in_ar" className="text-lg" />
              Xem 3D
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function QuizPanel({ story, quizAnswer, onAnswer, onRetry }: Props) {
  const q = story.quiz
  const answered = quizAnswer !== undefined
  const correct = answered && quizAnswer === q.answer
  const accent = story.accent
  return (
    <div key={`${story.era}-quiz`} className="tp-anim" style={{ animation: 'tp-enter 420ms ease-out both' }}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${accent}26`, color: accent }}>
          <MaterialIcon name="quiz" className="text-base" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>
          Thử thách · {story.chapter.split('·')[0].trim()}
        </span>
      </div>
      <h3 className="mt-2 text-base font-bold leading-snug text-[#142646] sm:text-lg">{q.question}</h3>
      <div className="mt-3 grid gap-2">
        {q.options.map((opt, i) => {
          const isRight = i === q.answer
          const isPicked = i === quizAnswer
          let cls = 'border-blue-100 bg-blue-50 hover:bg-blue-50 text-slate-700'
          if (answered && isRight) cls = 'border-emerald-400/70 bg-emerald-500/15 text-emerald-800'
          else if (answered && isPicked) cls = 'border-rose-400/70 bg-rose-500/15 text-rose-800'
          else if (answered) cls = 'border-blue-100 bg-slate-50 text-slate-500'
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${cls}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {answered && isRight && <MaterialIcon name="check_circle" className="text-lg text-emerald-700" />}
              {answered && isPicked && !isRight && <MaterialIcon name="cancel" className="text-lg text-rose-700" />}
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          <span className={`font-semibold ${correct ? 'text-emerald-700' : 'text-rose-700'}`}>{correct ? 'Chính xác! ' : 'Chưa đúng. '}</span>
          {q.explain}
          {!correct && (
            <button type="button" onClick={onRetry} className="ml-1 font-semibold underline underline-offset-2" style={{ color: accent }}>
              Thử lại
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** "Bạn có biết?" — luôn mở trên màn hình rộng, thu gọn trên điện thoại. */
function DidYouKnow({ text, accent }: { text: string; accent: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold sm:hidden"
        style={{ color: accent, background: `${accent}1f` }}
        aria-expanded={open}
      >
        <MaterialIcon name="lightbulb" className="text-base" />
        Bạn có biết?
        <MaterialIcon name={open ? 'expand_less' : 'expand_more'} className="text-base" />
      </button>
      <div className={`mt-2 gap-2 rounded-xl border-l-2 bg-blue-50 px-3 py-2 sm:mt-3 sm:flex ${open ? 'flex' : 'hidden'}`} style={{ borderColor: accent }}>
        <MaterialIcon name="lightbulb" className="mt-px hidden text-base sm:inline-block" style={{ color: accent }} />
        <p className="text-xs leading-relaxed text-slate-600">
          <span className="hidden font-semibold sm:inline" style={{ color: accent }}>
            Bạn có biết?{' '}
          </span>
          {text}
        </p>
      </div>
    </>
  )
}
