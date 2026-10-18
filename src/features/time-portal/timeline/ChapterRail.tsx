// src/features/time-portal/timeline/ChapterRail.tsx
// Thanh chọn chương gọn một dòng (thay thanh mốc thời gian cao ở cuối trang).

import { MaterialIcon } from '../../../components/ui/MaterialIcon'
import { ERA_VALUES, eraTimelineLabel, type EraValue } from '../eraLabels'
import { ERA_STORIES } from './storyData'

type Props = {
  current: EraValue
  onSelect: (era: EraValue) => void
  isLocked: (era: EraValue) => boolean
  isSolved: (era: EraValue) => boolean
}

export function ChapterRail({ current, onSelect, isLocked, isSolved }: Props) {
  const curIdx = ERA_VALUES.indexOf(current)
  return (
    <nav className="pb-safe shrink-0 border-t border-white/10 bg-neutral-950/95 px-2 py-1.5 backdrop-blur-xl sm:px-4" aria-label="Các chương">
      <ol className="flex items-stretch gap-1">
        {ERA_VALUES.map((e, i) => {
          const s = ERA_STORIES[e]
          const active = e === current
          const passed = i < curIdx
          const locked = isLocked(e)
          return (
            <li key={e} className="flex min-w-0 flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(e)}
                aria-current={active ? 'step' : undefined}
                className={`flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 text-left transition-colors sm:px-3 ${
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: active || passed ? s.accent : 'rgba(255,255,255,0.28)',
                    boxShadow: active ? `0 0 0 4px ${s.accent}33` : undefined,
                  }}
                />
                <span className="min-w-0 leading-tight">
                  <span className={`block truncate text-xs font-bold ${active ? 'text-white' : 'text-white/65'}`} style={active ? { color: s.accent } : undefined}>
                    {eraTimelineLabel(e)}
                  </span>
                  <span className="hidden truncate text-[10px] text-white/45 md:block">{s.chapter.split('·')[1]?.trim()}</span>
                </span>
                {locked ? (
                  <MaterialIcon name="lock" className="ml-auto text-sm text-white/40" />
                ) : isSolved(e) ? (
                  <MaterialIcon name="task_alt" className="ml-auto hidden text-sm text-emerald-300 sm:inline-block" />
                ) : null}
              </button>
              {i < ERA_VALUES.length - 1 && (
                <span className="hidden h-px w-4 shrink-0 sm:block lg:w-8" style={{ background: passed || active ? `${s.accent}88` : 'rgba(255,255,255,0.15)' }} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
