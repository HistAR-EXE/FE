import { httpClient } from '../shared/api/httpClient'
import { isAnalyticsAllowed } from './consent'
import { enqueueEvent } from './offlineOutbox'

const PILOT_SESSION_KEY = 'pilot_session_id'
/** When set, prefer this (usually visit_sessions UUID) over a random pilot id. */
const PILOT_BOUND_SESSION_KEY = 'pilot_bound_session_id'
const FLUSH_DELAY_MS = 400

/** Event types supported by POST /api/events/batch (keep in sync with BE EventsService.PILOT_EVENT_TYPES). */
export type PilotEventType =
  | 'session_start'
  | 'session_end'
  | 'station_arrived'
  | 'station_completed'
  | 'share_initiated'
  | 'export_created'
  | 'pack_loaded'
  | 'checkin_result'
  | 'nps_submitted'
  | 'landing_visit'
  | 'paywall_shown'
  | 'purchase_success'
  | 'portal_used'
  | 'video_played'
  | 'audio_played'
  | 'game_completed'
  | 'camera_opened'
  | 'chat_message'
  | 'content_report'
  | 'consent_updated'

/** Events worth persisting to the offline outbox immediately (field use: bad connectivity at stations). */
const DURABLE_EVENTS = new Set<string>([
  'station_arrived',
  'station_completed',
  'checkin_result',
  'purchase_success',
  'export_created',
  'session_end',
  'video_played',
  'audio_played',
  'game_completed',
  'chat_message',
  'portal_used',
  'content_report',
])

type PilotEventPayload = {
  clientUuid: string
  eventType: string
  stationCode?: string
  payload?: string
  occurredAt: string
  sessionId?: string
}

const queue: PilotEventPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

export function getPilotSessionId(): string {
  const bound = sessionStorage.getItem(PILOT_BOUND_SESSION_KEY)
  if (bound) return bound
  let id = sessionStorage.getItem(PILOT_SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(PILOT_SESSION_KEY, id)
  }
  return id
}

/** Bind pilot analytics session to visit_sessions.id (or creator histar_session_id). */
export function bindPilotSessionId(sessionId: string | null | undefined) {
  if (!sessionId?.trim()) return
  sessionStorage.setItem(PILOT_BOUND_SESSION_KEY, sessionId.trim())
  sessionStorage.setItem(PILOT_SESSION_KEY, sessionId.trim())
}

function scheduleFlush() {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushPilotEvents()
  }, FLUSH_DELAY_MS)
}

function persistToOutbox(items: PilotEventPayload[]) {
  for (const item of items) {
    void enqueueEvent(item.eventType, {
      clientUuid: item.clientUuid,
      stationCode: item.stationCode,
      payload: item.payload ? (safeParse(item.payload) ?? undefined) : undefined,
      occurredAt: item.occurredAt,
      sessionId: item.sessionId,
    })
  }
}

function safeParse(json: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(json)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

async function flushPilotEvents() {
  if (queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    persistToOutbox(batch)
    return
  }
  try {
    await httpClient.post('/api/events/batch', { events: batch })
  } catch {
    // Not fire-and-forget any more: keep the events in the IndexedDB outbox so they are retried online.
    persistToOutbox(batch)
  }
}

export type PilotEventExtras = {
  stationCode?: string
  payload?: Record<string, unknown>
  sessionId?: string
}

export function emitEvent(eventType: PilotEventType | (string & {}), extras: PilotEventExtras = {}) {
  if (!isAnalyticsAllowed()) return
  const item: PilotEventPayload = {
    clientUuid: crypto.randomUUID(),
    eventType,
    stationCode: extras.stationCode,
    payload: extras.payload ? JSON.stringify(extras.payload) : undefined,
    occurredAt: new Date().toISOString(),
    sessionId: extras.sessionId ?? getPilotSessionId(),
  }
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  if (offline || DURABLE_EVENTS.has(eventType)) {
    persistToOutbox([item])
    return
  }
  queue.push(item)
  scheduleFlush()
}

let sessionEndBound = false

/** Emits `session_end` once when the tab is hidden/closed (queued in the outbox so it survives unload). */
export function startSessionEndTracking() {
  if (sessionEndBound || typeof window === 'undefined') return
  sessionEndBound = true
  let sent = false
  const send = () => {
    if (sent) return
    sent = true
    emitEvent('session_end', { payload: { durationMs: Math.round(performance.now()) } })
  }
  window.addEventListener('pagehide', send)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send()
    else sent = false
  })
}