type ChatMessageContentProps = {
  content: string
  className?: string
}

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
    }
    return <span key={`${keyPrefix}-${index}`}>{part}</span>
  })
}

export function ChatMessageContent({ content, className = '' }: ChatMessageContentProps) {
  const lines = content.split('\n')

  return (
    <div className={className}>
      {lines.map((line, index) => {
        const trimmed = line.trim()
        const isSource = trimmed.startsWith('Nguồn:')
        const isDisclaimer = trimmed.startsWith('Chrono là một AI')
        const isBullet = /^[-*•]\s+/.test(trimmed)
        if (!trimmed) {
          return (
            <p key={`blank-${index}`} className="font-body-lg text-body-lg leading-relaxed">
              {'\u00A0'}
            </p>
          )
        }
        if (isBullet) {
          return (
            <div
              key={`bullet-${index}`}
              className="flex gap-2 font-body-lg text-body-lg leading-relaxed text-on-surface"
            >
              <span aria-hidden="true">•</span>
              <span>{renderInline(trimmed.replace(/^[-*•]\s+/, ''), String(index))}</span>
            </div>
          )
        }
        return (
          <p
            key={`line-${index}`}
            className={`leading-relaxed ${
              isSource || isDisclaimer
                ? 'text-sm text-on-surface-variant/70 mt-2'
                : 'font-body-lg text-body-lg text-on-surface'
            }`}
          >
            {renderInline(line, String(index))}
          </p>
        )
      })}
    </div>
  )
}
