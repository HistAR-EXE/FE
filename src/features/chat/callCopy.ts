const DISCLAIMER = /chrono là một ai và có thể mắc sai sót\.?/gi

function stripEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\uFE0F/g, '')
    .replace(/\u200D/g, '')
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function withoutDisclaimer(raw: string): string {
  return stripEmoji(raw).replace(DISCLAIMER, ' ')
}

/** Các dòng hiện trên thẻ góc phải. Cùng bản chữ với giọng đọc. */
export function answerCardLines(raw: string): string[] {
  const body = withoutDisclaimer(raw)
  return body
    .split(/\n+|(?:^|\s)\*\s+/)
    .map(stripMarkdown)
    .filter(Boolean)
}

function lowercaseHeadings(text: string): string {
  return text.replace(
    /(?<![\p{L}])(\p{Lu}{2,}(?:\s+\p{Lu}{2,})+)(?![\p{L}])/gu,
    (heading) => heading.toLocaleLowerCase('vi'),
  )
}

/** Bản đọc: dấu * đầu mục thành chấm, tiêu đề in hoa thành chữ thường. */
export function spokenReply(raw: string): string {
  let body = withoutDisclaimer(raw)
  body = body.replace(/([.!?…]?)\s*\*\s+/g, (_, punct: string) => (punct ? `${punct} ` : '. '))
  body = body.replace(/[*_`#>]+/g, ' ')
  body = lowercaseHeadings(body)
  return body.replace(/\s+/g, ' ').replace(/\s+([.!?…])/g, '$1').trim()
}

export function spokenSentences(raw: string): string[] {
  const spoken = spokenReply(raw)
  if (!spoken) return []
  const parts = spoken.split(/(?<=[.!?…])\s+/).map((part) => part.trim()).filter(Boolean)
  return parts.length > 0 ? parts : [spoken]
}

/** Một mạch đọc cho cuộc gọi. Gộp câu liền nhau để không nghỉ giữa mỗi đoạn. */
const SPEECH_CHUNK_CHARS = 720

export function spokenChunks(raw: string): string[] {
  const parts = spokenSentences(raw)
  const chunks: string[] = []
  let current = ''
  for (const part of parts) {
    const next = current ? `${current} ${part}` : part
    if (current && next.length > SPEECH_CHUNK_CHARS) {
      chunks.push(current)
      current = part
    } else {
      current = next
    }
  }
  if (current) chunks.push(current)
  return chunks
}
