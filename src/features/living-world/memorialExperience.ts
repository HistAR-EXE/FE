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

export function reconcileEpilogue(confirmed: unknown, rows: QueueRow[]): boolean {
 let returned = confirmed === 'RETURNED'
 for (const row of [...rows].sort((a,b) => a.createdAt - b.createdAt)) {
  if (row.status === 'REJECTED_REQUIRES_ACTION') continue
  if (row.intent.actionType === 'SAVE_CHECKPOINT' && row.intent.targetId === 'S5' && row.intent.payload.epilogue === 'RETURNED') {
   returned = true
  }
 }
 return returned
}

export function describeMemorialContext(checkpoint: MemorialCheckpoint | null, epilogueReturned: boolean, synthesisConfirmed: boolean) {
 const isEpilogue = Boolean(epilogueReturned && synthesisConfirmed)
 const targetForChoice = checkpoint?.choice === 'FLOWERS'
  ? 'MEMORIAL_FLOWERS'
  : checkpoint?.choice === 'INCENSE'
  ? 'MEMORIAL_INCENSE'
  : checkpoint?.choice === 'QUIET'
  ? 'MEMORIAL_QUIET'
  : null
 const epilogueSummary = isEpilogue
  ? 'Hành trình khám phá Mạch Sống 1967 đã khép lại tại Củ Chi hôm nay. Những căn hầm, bếp lửa, nguồn nước và bàn tay chăm sóc vừa đi qua nay lắng lại trong không gian tri ân hiện đại. Mọi nghi thức đều tự nguyện và không tính điểm thưởng.'
  : 'Không gian tưởng niệm hiện đại tại Củ Chi hôm nay. Bạn có thể tự nguyện dâng hoa, dâng hương, dành một khoảng lặng hoặc trở về trạm thời gian bất cứ lúc nào.'
 const phaseOutcome = !checkpoint || checkpoint.phase === 'LEFT'
  ? 'Bạn đang tham quan tự do tại sân tưởng niệm. Có thể chọn một nghi thức tri ân, đọc lời tưởng niệm hoặc trở về trạm thời gian.'
  : checkpoint.phase === 'SELECTED'
  ? (checkpoint.choice === 'FLOWERS'
   ? 'Bạn đã chọn dâng hoa. Hãy chạm bó hoa trên bàn tưởng niệm hoặc dùng nút đặt hoa để thực hiện.'
   : 'Bạn đã chọn dâng hương. Hãy chạm lư hương hoặc dùng nút thắp hương để thực hiện.')
  : checkpoint.phase === 'OFFERED'
  ? (checkpoint.choice === 'FLOWERS'
   ? 'Bó hoa đã được đặt trang trọng trên bàn tưởng niệm. Bạn có thể ở lại yên lặng hoặc tiếp tục hành trình.'
   : 'Nén hương đã được thắp tại lư hương trong không gian tĩnh lặng. Bạn có thể ở lại yên lặng hoặc tiếp tục hành trình.')
  : 'Khoảng lặng tưởng niệm tự nguyện đang diễn ra. Không có giới hạn thời gian hay điểm số; bạn có thể rời đi hoặc trở về trạm bất cứ lúc nào.'
 return {
  isEpilogue,
  targetForChoice,
  epilogueSummary,
  phaseOutcome,
 }
}

/** The server retains RETURNED when other checkpoints are saved; only S5 accepts this payload field. */
export function checkpointEpiloguePayload(zone:string,returned:boolean):{epilogue?:'RETURNED'}{
 return zone==='S5'&&returned?{epilogue:'RETURNED'}:{}
}
