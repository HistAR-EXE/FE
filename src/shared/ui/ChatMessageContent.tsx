// src/shared/ui/ChatMessageContent.tsx
type ChatMessageContentProps = {
    content: string
    className?: string
}

function renderInline(text: string, keyPrefix: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={`${keyPrefix}-${index}`} className="font-bold">{part.slice(2, -2)}</strong>
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
                        <p key={`blank-${index}`} className="text-sm md:text-base leading-relaxed">
                            {'\u00A0'}
                        </p>
                    )
                }
                if (isBullet) {
                    return (
                        <div
                            key={`bullet-${index}`}
                            className="flex gap-2 text-sm md:text-base leading-relaxed"
                        >
                            <span aria-hidden="true" className="text-[#0275FB] font-bold">•</span>
                            <span>{renderInline(trimmed.replace(/^[-*•]\s+/, ''), String(index))}</span>
                        </div>
                    )
                }
                return (
                    <p
                        key={`line-${index}`}
                        className={`leading-relaxed ${
                            isSource || isDisclaimer
                                ? 'text-xs text-gray-500 mt-2' // Text phụ
                                : 'text-sm md:text-base' // Text chính
                        }`}
                    >
                        {renderInline(line, String(index))}
                    </p>
                )
            })}
        </div>
    )
}