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
    <nav className="pb-safe shrink-0 border-t border-blue-100 bg-white/95 px-2 py-1.5 backdrop-blur-xl sm:px-4" aria-label="Các chương">
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
                  active ? 'border border-amber-300 bg-[#fff3b8] shadow-sm' : 'border border-transparent hover:bg-blue-50'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: active ? '#0866d9' : passed ? '#7faeea' : '#cbd5e1',
                    boxShadow: active ? '0 0 0 4px #0866d91a' : undefined,
                  }}
                />
                <span className="min-w-0 leading-tight">
                  <span className={`block truncate text-xs font-bold ${active ? 'text-blue-800' : 'text-slate-600'}`}>
                    {eraTimelineLabel(e)}
                  </span>
                  <span className="hidden truncate text-[10px] text-slate-500 md:block">{s.chapter.split('·')[1]?.trim()}</span>
                </span>
                {locked ? (
                  <MaterialIcon name="lock" className="ml-auto text-sm text-slate-400" />
                ) : isSolved(e) ? (
                  <MaterialIcon name="task_alt" className="ml-auto hidden text-sm text-emerald-700 sm:inline-block" />
                ) : null}
              </button>
              {i < ERA_VALUES.length - 1 && (
                <span className="hidden h-px w-4 shrink-0 sm:block lg:w-8" style={{ background: passed || active ? '#a5c7f2' : '#e2e8f0' }} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
