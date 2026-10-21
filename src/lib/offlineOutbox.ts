// src/lib/offlineOutbox.ts
// Dexie (IndexedDB) outbox: queue pilot events / station check-ins while offline, flush when online.
// Idempotency: every item carries a clientUuid, which BE uses to dedupe on POST /api/events/batch.
import Dexie, { type EntityTable } from 'dexie'
import { httpClient } from '../shared/api/httpClient'
import { getSessionMeta } from '../shared/auth/session'

export type OutboxKind = 'event' | 'checkin'

export type OutboxItem = {
  clientUuid: string
  kind: OutboxKind
  eventType: string
  stationCode?: string
  /** JSON string, same shape as EventBatchRequest.PilotEventItem.payload */
  payload?: string
  occurredAt: string
  sessionId?: string
  createdAt: number
  attempts: number
  ownerUserId?: string
}

const db = new Dexie('histar-outbox') as Dexie & {
  outbox: EntityTable<OutboxItem, 'clientUuid'>
}
db.version(1).stores({
  outbox: 'clientUuid, kind, createdAt',
})
db.version(2).stores({
  outbox: 'clientUuid, kind, ownerUserId, createdAt',
})

const BATCH_SIZE = 50
const MAX_ATTEMPTS = 8

export type EnqueueExtras = {
  stationCode?: string
  payload?: Record<string, unknown>
  sessionId?: string
  clientUuid?: string
  /** ISO timestamp; defaults to now (use the original time when re-queuing a failed send). */
  occurredAt?: string
}

async function enqueue(kind: OutboxKind, eventType: string, extras: EnqueueExtras): Promise<OutboxItem> {
  const ownerUserId = getSessionMeta().userId ?? undefined
  if (kind === 'checkin' && !ownerUserId) {
    throw new Error('Bạn cần đăng nhập để lưu check-in chờ đồng bộ.')
  }
  const item: OutboxItem = {
    clientUuid: extras.clientUuid ?? crypto.randomUUID(),
    kind,
    eventType,
    stationCode: extras.stationCode,
    payload: extras.payload ? JSON.stringify(extras.payload) : undefined,
    occurredAt: extras.occurredAt ?? new Date().toISOString(),
    sessionId: extras.sessionId,
    createdAt: Date.now(),
    attempts: 0,
    ownerUserId,
  }
  await db.outbox.put(item)
  if (typeof navigator !== 'undefined' && navigator.onLine) void flushOutbox()
  return item
}

export function enqueueEvent(eventType: string, extras: EnqueueExtras = {}) {
  return enqueue('event', eventType, extras)
}

/**
 * Check-ins are replayed against POST /api/checkins (idempotent via `clientUuid`), not the events batch.
 * `extras.payload` must hold the full CheckinRequest body (locationId, qrPayload, presenceMethod, ...).
 */
export function enqueueCheckin(stationCode: string, extras: Omit<EnqueueExtras, 'stationCode'> = {}) {
  return enqueue('checkin', 'checkin', { ...extras, stationCode })
}

/** True when a request failed because the network/backend was unreachable (worth queuing offline). */
export function isOfflineLikeError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const err = e as { message?: string; status?: number } | null
  if (!err) return false
  return err.message === 'Network Error' || err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504
}

export function pendingOutboxCount() {
  return db.outbox.count()
}

export async function listPendingCheckins(locationId?: string): Promise<OutboxItem[]> {
  const ownerUserId = getSessionMeta().userId
  if (!ownerUserId) return []
  const items = await db.outbox
    .where('ownerUserId')
    .equals(ownerUserId)
    .filter((item) => item.kind === 'checkin')
    .toArray()
  if (!locationId) return items
  return items.filter((item) => {
    try {
      const payload = item.payload ? JSON.parse(item.payload) as { locationId?: string } : null
      return payload?.locationId === locationId
    } catch {
      return false
    }
  })
}

let flushing = false

/** 4xx (except auth/timeout/rate-limit) will never succeed on retry, so the item is dropped. */
function isPermanentFailure(e: unknown): boolean {
  const status = (e as { status?: number } | null)?.status
  return typeof status === 'number' && status >= 400 && status < 500 && ![401, 408, 429].includes(status)
}

async function flushCheckins(items: OutboxItem[]): Promise<{ done: string[]; failed: OutboxItem[] }> {
  const done: string[] = []
  const failed: OutboxItem[] = []
  for (const item of items) {
    try {
      const body = item.payload ? (JSON.parse(item.payload) as Record<string, unknown>) : {}
      await httpClient.post('/api/checkins', { ...body, clientUuid: item.clientUuid })
      done.push(item.clientUuid)
    } catch (e) {
      if (isPermanentFailure(e)) done.push(item.clientUuid)
      else failed.push(item)
    }
  }
  return { done, failed }
}

/** Sends queued items (events -> /api/events/batch, check-ins -> /api/checkins). Returns number delivered. */
export async function flushOutbox(): Promise<number> {
  if (flushing) return 0
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
  const ownerUserId = getSessionMeta().userId
  if (!ownerUserId) return 0
  flushing = true
  let sent = 0
  try {
    for (;;) {
      const owned = await db.outbox.where('ownerUserId').equals(ownerUserId).sortBy('createdAt')
      const batch = owned.slice(0, BATCH_SIZE)
      if (batch.length === 0) break
      const failed: OutboxItem[] = []
      const delivered: string[] = []

      const checkins = batch.filter((i) => i.kind === 'checkin')
      if (checkins.length) {
        const r = await flushCheckins(checkins)
        delivered.push(...r.done)
        failed.push(...r.failed)
      }

      const events = batch.filter((i) => i.kind !== 'checkin')
      if (events.length) {
        try {
          await httpClient.post('/api/events/batch', {
            events: events.map((i) => ({
              clientUuid: i.clientUuid,
              eventType: i.eventType,
              stationCode: i.stationCode,
              payload: i.payload,
              occurredAt: i.occurredAt,
              sessionId: i.sessionId,
            })),
          })
          delivered.push(...events.map((i) => i.clientUuid))
        } catch (e) {
          if (isPermanentFailure(e)) delivered.push(...events.map((i) => i.clientUuid))
          else failed.push(...events)
        }
      }

      if (delivered.length) {
        await db.outbox.bulkDelete(delivered)
        sent += delivered.length
      }
      if (failed.length) {
        // Keep items for the next online/tick; drop poison items after MAX_ATTEMPTS.
        const exhausted: string[] = []
        for (const i of failed) {
          if (i.attempts + 1 >= MAX_ATTEMPTS) exhausted.push(i.clientUuid)
          else await db.outbox.update(i.clientUuid, { attempts: i.attempts + 1 })
        }
        if (exhausted.length) await db.outbox.bulkDelete(exhausted)
        break
      }
    }
  } finally {
    flushing = false
  }
  return sent
}
let started = false

/** Flush on `online` and once at startup. Safe to call multiple times. */
export function startOutboxAutoFlush() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('online', () => void flushOutbox())
  void flushOutbox()
}
