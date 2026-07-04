// src/shared/ui/toast/ChatMessageContent.tsx
type ChatMessageContentProps = {
  content: string
  className?: string
}

export function ChatMessageContent({ content, className = '' }: ChatMessageContentProps) {
  const lines = content.split('\n')

  return (
    <div className={className}>
      {lines.map((line, index) => {
        const isSource = line.trimStart().startsWith('Nguồn:')
        return (
          <p
            key={`${index}-${line.slice(0, 24)}`}
            className={`font-body-lg text-body-lg leading-relaxed ${isSource ? 'text-sm text-on-surface-variant/70 mt-2' : 'text-on-surface'}`}
          >
            {line || '\u00A0'}
          </p>
        )
      })}
    </div>
  )
}
