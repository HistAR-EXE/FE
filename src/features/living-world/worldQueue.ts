export type WorldIntent={actionType:string;targetId:string;payload:Record<string,unknown>}
export type WorldWire=WorldIntent&{actionId:string;releaseVersion:number;expectedRevision:number}
export type QueueRow={id:string;owner:string;createdAt:number;dependsOn?:string;status:'PENDING'|'WAITING_DEPENDENCY'|'REJECTED_REQUIRES_ACTION';intent:WorldIntent;wire?:WorldWire;wireActionId?:string;error?:string}
export type QueueStore={all:()=>Promise<QueueRow[]>;put:(row:QueueRow)=>Promise<unknown>;remove:(id:string)=>Promise<unknown>;freezeWire?:(id:string,wire:WorldWire)=>Promise<WorldWire|null>;repairLegacyEpilogue?:(id:string,owner:string)=>Promise<QueueRow|null>}
export type WorldState={revision:number;releaseVersion:number;facts?:string[];mode?:string;checkpoint?:{zone?:string;rice?:number;last?:'LEFT'|'RIGHT';memorial?:unknown;kitchenEcho?:unknown;epilogue?:unknown};moment?:'LOCKED'|'AVAILABLE'|'PRESENTED'|'VIEWED';callbackAvailable?:boolean;activities?:string[];activityPersistence?:boolean;memorialPersistence?:boolean;echoPersistence?:boolean;quests?:string[];foundations?:string[];synthesisComplete?:boolean;kitchenCareCallback?:'LOCKED'|'AVAILABLE'|'VIEWED'}
/** Run only inside the store's current-row transaction. Uncertain frozen wires are immutable. */
export function repairLegacyEpilogueRow(row:QueueRow):QueueRow{
 const wrong=row.intent.actionType==='SAVE_CHECKPOINT'&&row.intent.targetId!=='S5'&&row.intent.payload.epilogue==='RETURNED'
 const rollback=row.status==='REJECTED_REQUIRES_ACTION'&&row.error?.includes('INVALID_EPILOGUE')
 if(!wrong||!((!row.wire&&row.status!=='REJECTED_REQUIRES_ACTION')||rollback))return row
 const payload={...row.intent.payload};delete payload.epilogue
 return{...row,intent:{...row.intent,payload},wire:undefined,wireActionId:crypto.randomUUID(),status:'PENDING',error:undefined}
}

type Transport={state:()=>Promise<WorldState>;send:(wire:WorldWire)=>Promise<WorldState>;isCurrent?:()=>boolean}
/** Retained account queue. A wire request is frozen BEFORE send to survive a lost acknowledgement. */
export async function flushWorldQueue(store:QueueStore,owner:string,transport:Transport){
 const rows=(await store.all()).filter(r=>r.owner===owner).sort((a,b)=>a.createdAt-b.createdAt)
 const unresolved=new Set(rows.map(r=>r.id))
 for(const snapshot of rows){
  let row=snapshot
  if(transport.isCurrent&&!transport.isCurrent())break
  // Re-read/repair atomically: another tab may already have frozen the snapshot's proposal.
  if(store.repairLegacyEpilogue&&row.intent.actionType==='SAVE_CHECKPOINT'&&row.intent.targetId!=='S5'&&row.intent.payload.epilogue==='RETURNED'){
   const current=await store.repairLegacyEpilogue(row.id,owner)
   if(!current){unresolved.delete(row.id);continue}
   row=current
  }
  if(row.status==='REJECTED_REQUIRES_ACTION')continue
  if(row.dependsOn&&unresolved.has(row.dependsOn)){await store.put({...row,status:'WAITING_DEPENDENCY'});continue}
  try{
   if(!row.wire){
    const state=await transport.state();const proposed={...row.intent,actionId:row.wireActionId??row.id,releaseVersion:state.releaseVersion,expectedRevision:state.revision}
    if(store.freezeWire){const frozen=await store.freezeWire(row.id,proposed);if(!frozen){unresolved.delete(row.id);continue}row.wire=frozen}
    else {row.wire=proposed;await store.put(row)}
   }
   if(transport.isCurrent&&!transport.isCurrent())break
   await transport.send(row.wire);await store.remove(row.id);unresolved.delete(row.id)
  }catch(error){
   const e=error as {status?:number;message?:string};const message=e.message??'Đang chờ kết nối'
   const status=e.status&&e.status>=400&&e.status<500&&e.status!==401&&e.status!==403?(message.includes('DEPENDENCY_MISSING')?'WAITING_DEPENDENCY':'REJECTED_REQUIRES_ACTION'):'PENDING'
   // A dependency rejection is a confirmed rollback, unlike a lost network acknowledgement.
   // Rebase only that rejected attempt; uncertain deliveries retain the exact original wire.
   await store.put({...row,status,error:message,...(status==='WAITING_DEPENDENCY'?{wire:undefined,wireActionId:crypto.randomUUID()}:{})})
  }
 }
}
