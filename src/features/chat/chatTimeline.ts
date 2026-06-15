import type { ChatMessage } from './api'

export const SESSION_GAP_MS = 10 * 60 * 1000

export type ChatTimelineItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'session'; key: string; label: string }
  | { type: 'message'; key: string; message: ChatMessage }

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDayLabel(date: Date): string {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (sameDay(date, now)) return 'Hôm nay'
  if (sameDay(date, yesterday)) return 'Hôm qua'
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

function formatSessionLabel(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function buildChatTimeline(messages: ChatMessage[]): ChatTimelineItem[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const items: ChatTimelineItem[] = []
  let lastDayKey: string | null = null
  let lastTimestamp: number | null = null

  for (const message of sorted) {
    const at = new Date(message.createdAt)
    const dayKey = at.toDateString()

    if (dayKey !== lastDayKey) {
      items.push({ type: 'day', key: `day-${dayKey}`, label: formatDayLabel(at) })
      lastDayKey = dayKey
      lastTimestamp = null
    }

    const currentTs = at.getTime()
    const gap = lastTimestamp === null ? SESSION_GAP_MS + 1 : currentTs - lastTimestamp
    if (gap > SESSION_GAP_MS) {
      items.push({
        type: 'session',
        key: `session-${message.id}`,
        label: formatSessionLabel(at),
      })
    }

    items.push({ type: 'message', key: message.id, message })
    lastTimestamp = currentTs
  }

  return items
}
