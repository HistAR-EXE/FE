const ARTIFACT = '/artifacts/cu-chi'

type ImageRule = { phrase: string; files: string[] }

const RULES: ImageRule[] = [
  { phrase: 'tia tản', files: ['cc-04'] },
  { phrase: 'tản khói', files: ['cc-04'] },
  { phrase: 'rãnh khói', files: ['cc-02', 'cc-05'] },
  { phrase: 'hoàng cầm', files: ['cc-01', 'cc-06'] },
  { phrase: 'hầm khói', files: ['cc-03'] },
  { phrase: 'lá phủ', files: ['cc-07'] },
  { phrase: 'miệng hầm', files: ['cc-07', 'cc-10'] },
  { phrase: 'ngụy trang', files: ['cc-07', 'cc-10'] },
  { phrase: 'đất phủ', files: ['cc-09'] },
  { phrase: 'cửa hầm', files: ['cc-12'] },
  { phrase: 'miệng giếng', files: ['cc-19', 'cc-20', 'cc-22', 'cc-24'] },
  { phrase: 'tầng một', files: ['cc-13'] },
  { phrase: 'tầng 1', files: ['cc-13'] },
  { phrase: 'tầng hai', files: ['cc-14'] },
  { phrase: 'tầng 2', files: ['cc-14'] },
  { phrase: 'tầng ba', files: ['cc-15'] },
  { phrase: 'tầng 3', files: ['cc-15'] },
  { phrase: 'lối tầng', files: ['cc-16'] },
  { phrase: 'sa bàn', files: ['cc-17'] },
  { phrase: 'hướng đào', files: ['cc-21'] },
  { phrase: 'im lặng', files: ['cc-23'] },
  { phrase: 'bếp', files: ['cc-01', 'cc-06'] },
  { phrase: 'nồi', files: ['cc-01'] },
  { phrase: 'rãnh', files: ['cc-02', 'cc-05'] },
  { phrase: 'nắp', files: ['cc-08', 'cc-11'] },
  { phrase: 'giếng', files: ['cc-19', 'cc-20', 'cc-22', 'cc-24'] },
  { phrase: 'tầng', files: ['cc-16', 'cc-18'] },
  { phrase: 'đào', files: ['cc-21'] },
  { phrase: 'gác', files: ['cc-23'] },
].sort((a, b) => b.phrase.length - a.phrase.length)

const DEFAULT_FILES = ['cc-18', 'cc-08', 'cc-06', 'cc-13']
const MAX_IMAGES = 8

function src(file: string): string {
  return `${ARTIFACT}/${file}.png`
}

function isTokenChar(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char)
}

/** Ảnh theo thứ tự cụm xuất hiện trong câu trả lời. Giữ dấu, cụm dài khớp trước. */
export function imagesForReply(reply: string): string[] {
  const text = reply.normalize('NFC').toLocaleLowerCase('vi')
  const claimed: Array<{ start: number; end: number; files: string[] }> = []

  for (const rule of RULES) {
    let from = 0
    while (from < text.length) {
      const at = text.indexOf(rule.phrase, from)
      if (at < 0) break
      const end = at + rule.phrase.length
      const before = at === 0 ? '' : text[at - 1] ?? ''
      const after = text[end] ?? ''
      const overlaps = claimed.some((span) => at < span.end && end > span.start)
      if (!isTokenChar(before) && !isTokenChar(after) && !overlaps) {
        claimed.push({ start: at, end, files: rule.files })
      }
      from = end
    }
  }

  claimed.sort((a, b) => a.start - b.start)
  const urls: string[] = []
  for (const hit of claimed) {
    for (const file of hit.files) {
      const url = src(file)
      if (!urls.includes(url)) urls.push(url)
      if (urls.length >= MAX_IMAGES) return urls
    }
  }
  if (urls.length === 0) return DEFAULT_FILES.map(src)
  return urls
}
