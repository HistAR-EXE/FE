import { useState } from 'react'
import type { ChatSource } from '../../features/chat/api'

type ChatSourcesBlockProps = {
  sources: ChatSource[]
}

export function ChatSourcesBlock({ sources }: ChatSourcesBlockProps) {
  const [open, setOpen] = useState(false)
  if (!sources.length) return null

  return (
    <div className="mt-sm pt-sm border-t border-outline-variant/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-left text-xs text-on-surface-variant hover:text-secondary w-full"
      >
        📚 Nguồn (kho tư liệu di tích): {sources.map((s) => s.title).join(' · ')}
        <span className="ml-1 opacity-70">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="mt-1 space-y-1 text-xs text-on-surface-variant">
          {sources.map((s) => (
            <li key={s.title}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="text-secondary underline">
                  {s.title}
                </a>
              ) : (
                <span className="font-medium text-on-surface">{s.title}</span>
              )}
              {s.excerpt && s.excerpt !== s.title && (
                <p className="text-[11px] mt-0.5 opacity-90">{s.excerpt}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
