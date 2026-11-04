export type WorldIntent={actionType:string;targetId:string;payload:Record<string,unknown>}
export type WorldWire=WorldIntent&{actionId:string;releaseVersion:number;expectedRevision:number}
export type QueueRow={id:string;owner:string;createdAt:number;dependsOn?:string;status:'PENDING'|'WAITING_DEPENDENCY'|'REJECTED_REQUIRES_ACTION';intent:WorldIntent;wire?:WorldWire;wireActionId?:string;error?:string}
export type QueueStore={all:()=>Promise<QueueRow[]>;put:(row:QueueRow)=>Promise<unknown>;remove:(id:string)=>Promise<unknown>;freezeWire?:(id:string,wire:WorldWire)=>Promise<WorldWire|null>}
export type WorldState={revision:number;releaseVersion:number;facts?:string[];mode?:string;checkpoint?:{zone?:string;rice?:number;last?:'LEFT'|'RIGHT'};moment?:'LOCKED'|'AVAILABLE'|'PRESENTED'|'VIEWED';callbackAvailable?:boolean}
type Transport={state:()=>Promise<WorldState>;send:(wire:WorldWire)=>Promise<WorldState>;isCurrent?:()=>boolean}
/** Retained account queue. A wire request is frozen BEFORE send to survive a lost acknowledgement. */
export async function flushWorldQueue(store:QueueStore,owner:string,transport:Transport){
 const rows=(await store.all()).filter(r=>r.owner===owner).sort((a,b)=>a.createdAt-b.createdAt)
 const unresolved=new Set(rows.map(r=>r.id))
 for(const row of rows){
  if(transport.isCurrent&&!transport.isCurrent())break
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
