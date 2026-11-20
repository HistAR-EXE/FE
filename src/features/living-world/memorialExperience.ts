import type {QueueRow} from './worldQueue'

export type MemorialChoice = 'FLOWERS' | 'INCENSE' | 'QUIET' | 'SKIP'
export type MemorialPhase = 'SELECTED' | 'OFFERED' | 'REFLECTING' | 'LEFT'
export type MemorialCheckpoint = {choice: MemorialChoice; phase: MemorialPhase}

export function readMemorialCheckpoint(value: unknown): MemorialCheckpoint | null {
 if (!value || typeof value !== 'object') return null
 const candidate = value as Record<string, unknown>
 if (!['FLOWERS', 'INCENSE', 'QUIET', 'SKIP'].includes(String(candidate.choice))) return null
 if (!['SELECTED', 'OFFERED', 'REFLECTING', 'LEFT'].includes(String(candidate.phase))) return null
 if (candidate.phase === 'OFFERED' && !['FLOWERS', 'INCENSE'].includes(String(candidate.choice))) return null
 if (candidate.choice === 'SKIP' && candidate.phase !== 'LEFT') return null
 return {choice: candidate.choice as MemorialChoice, phase: candidate.phase as MemorialPhase}
}

/** Pending presentation follows the existing account queue; rejected actions never survive reconciliation. */
export function reconcileMemorial(confirmed: unknown, rows: QueueRow[]): MemorialCheckpoint | null {
 let result = readMemorialCheckpoint(confirmed)
 for (const row of [...rows].sort((a,b) => a.createdAt - b.createdAt)) {
  if (row.status === 'REJECTED_REQUIRES_ACTION') continue
  if (row.intent.actionType !== 'SAVE_CHECKPOINT' || row.intent.targetId !== 'S5') continue
  const next = readMemorialCheckpoint(row.intent.payload.memorial)
  if (next) result = next
 }
 return result
}
