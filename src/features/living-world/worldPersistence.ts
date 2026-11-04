import Dexie, { type EntityTable } from 'dexie'
import { getData, httpClient } from '../../shared/api/httpClient'
import { flushWorldQueue, type QueueRow, type WorldIntent, type WorldState, type WorldWire } from './worldQueue'
import {getSessionMeta} from '../../shared/auth/session'
import {saveVerifiedState} from './worldContinuity'
const db=new Dexie('timelens-world-business-actions') as Dexie&{actions:EntityTable<QueueRow,'id'>}
db.version(1).stores({actions:'id,owner,createdAt,status'})
const store={all:()=>db.actions.toArray(),put:(row:QueueRow)=>db.actions.put(row),remove:(id:string)=>db.actions.delete(id),freezeWire:(id:string,wire:WorldWire)=>db.transaction('rw',db.actions,async()=>{const row=await db.actions.get(id);if(!row)return null;if(row.wire)return row.wire;await db.actions.update(id,{wire});return wire})}
const base='/api/v2/worlds/cuchi-mach-song'
export const readWorldState=async()=>{const owner=getSessionMeta()?.userId;const state=await getData<WorldState>(httpClient.get(`${base}/state`));if(owner&&getSessionMeta()?.userId===owner)saveVerifiedState(owner,state);return state}
let running:Promise<void>=Promise.resolve()
let writing:Promise<unknown>=Promise.resolve()
export async function enqueueWorld(owner:string,intent:WorldIntent){
 const operation=writing.catch(()=>{}).then(async()=>{
  const existing=(await db.actions.where('owner').equals(owner).toArray()).sort((a,b)=>a.createdAt-b.createdAt)
  const parent=existing.at(-1)
  await db.actions.put({id:crypto.randomUUID(),owner,createdAt:Math.max(Date.now(),(parent?.createdAt??0)+1),dependsOn:parent?.id,status:'PENDING',intent})
 });writing=operation;await operation
}
export async function syncWorld(owner:string,isCurrent:()=>boolean){
 // One flight per tab; server revision + receipts cover other tabs/devices.
 const operation=running.catch(()=>{}).then(()=>flushWorldQueue(store,owner,{state:readWorldState,send:wire=>getData<WorldState>(httpClient.post(`${base}/actions`,wire)),isCurrent}))
 running=operation;await operation
}
export const pendingWorld=(owner:string)=>db.actions.where('owner').equals(owner).toArray()
export async function retryWorld(owner:string){
 // Explicit retry creates a fresh identity after a confirmed rejection, never after a network failure.
 for(const row of await pendingWorld(owner))if(row.status==='REJECTED_REQUIRES_ACTION'){
  const id=crypto.randomUUID();await db.actions.put({...row,id,wire:undefined,status:'PENDING',error:undefined})
  for(const child of await pendingWorld(owner))if(child.dependsOn===row.id)await db.actions.update(child.id,{dependsOn:id})
  await db.actions.delete(row.id)
 }
}
