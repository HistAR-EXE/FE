import type {QueueRow} from './worldQueue'
/** Presentation checkpoint only; never a foundation or evidence acknowledgement. */
export function reconcileKitchenEcho(confirmed:unknown,rows:QueueRow[]):boolean {
 return confirmed===true||rows.some(row=>row.status!=='REJECTED_REQUIRES_ACTION'&&row.intent.actionType==='SAVE_CHECKPOINT'&&row.intent.targetId==='L1-C'&&row.intent.payload.kitchenEcho===true)
}
