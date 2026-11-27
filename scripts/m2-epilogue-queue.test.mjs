import * as queue from '../src/features/living-world/worldQueue.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import * as memorial from '../src/features/living-world/memorialExperience.ts'
import {flushWorldQueue} from '../src/features/living-world/worldQueue.ts'
test('returned Epilogue flag is sent only to S5; other checkpoints rely on server preservation',()=>{
 assert.equal(typeof memorial.checkpointEpiloguePayload,'function')
 for(const zone of ['S0','S1','S2','S3','S4','L1-C','L2-B'])assert.deepEqual(memorial.checkpointEpiloguePayload(zone,true),{})
 assert.deepEqual(memorial.checkpointEpiloguePayload('S5',true),{epilogue:'RETURNED'})
 assert.deepEqual(memorial.checkpointEpiloguePayload('S5',false),{})
})
test('known rejected legacy Epilogue wire is repaired with a new action identity and unblocks its child',async()=>{
 const intent={actionType:'SAVE_CHECKPOINT',targetId:'S0',payload:{epilogue:'RETURNED',rice:6}}
 const rows=new Map([['root',{id:'root',owner:'a',createdAt:1,status:'REJECTED_REQUIRES_ACTION',error:'INVALID_EPILOGUE',intent,wire:{...intent,actionId:'old-wire',releaseVersion:1,expectedRevision:85}}],['child',{id:'child',owner:'a',createdAt:2,status:'WAITING_DEPENDENCY',dependsOn:'root',intent:{actionType:'COMPLETE_ACTIVITY',targetId:'A03_BATTER',payload:{}}}]])
 const store={all:async()=>[...rows.values()],put:async r=>rows.set(r.id,r),remove:async id=>rows.delete(id),repairLegacyEpilogue:async id=>{const current=rows.get(id);if(!current)return null;const next=queue.repairLegacyEpilogueRow(current);rows.set(id,next);return next}},sent=[]
 await flushWorldQueue(store,'a',{state:async()=>({revision:85+sent.length,releaseVersion:1}),send:async wire=>{sent.push(wire);return{revision:85+sent.length,releaseVersion:1}}})
 assert.equal(sent.length,2);assert.notEqual(sent[0].actionId,'old-wire');assert.deepEqual(sent[0].payload,{rice:6});assert.equal(rows.size,0)
})
test('uncertain already-sent wire is never rewritten by the legacy correction',async()=>{
 const intent={actionType:'SAVE_CHECKPOINT',targetId:'S0',payload:{epilogue:'RETURNED'}}
 const wire={...intent,actionId:'uncertain',releaseVersion:1,expectedRevision:85},row={id:'root',owner:'a',createdAt:1,status:'PENDING',intent,wire},rows=new Map([['root',row]]),sent=[]
 await flushWorldQueue({all:async()=>[...rows.values()],put:async r=>rows.set(r.id,r),remove:async id=>rows.delete(id)},'a',{state:async()=>({revision:85,releaseVersion:1}),send:async w=>{sent.push(w);throw{status:503,message:'offline'}}})
 assert.deepEqual(sent,[wire]);assert.deepEqual(rows.get('root').wire,wire)
})

test('two tabs repairing a legacy proposal retain the first frozen wire after a lost acknowledgement',async()=>{
 const intent={actionType:'SAVE_CHECKPOINT',targetId:'S0',payload:{epilogue:'RETURNED',rice:6}},initial={id:'root',owner:'a',createdAt:1,status:'PENDING',intent},rows=new Map([['root',initial]])
 let releaseSecond;const firstSend=new Promise(resolve=>releaseSecond=resolve);let snapshots=0;const sent=[]
 const store={
  all:async()=>{const snapshot=structuredClone([...rows.values()]);if(++snapshots===2)await firstSend;return snapshot},
  put:async row=>rows.set(row.id,structuredClone(row)),remove:async id=>rows.delete(id),
  repairLegacyEpilogue:async id=>{const current=rows.get(id);if(!current)return null;const next=queue.repairLegacyEpilogueRow(current);rows.set(id,structuredClone(next));return structuredClone(next)},
  freezeWire:async(id,wire)=>{const current=rows.get(id);if(!current)return null;if(current.wire)return current.wire;rows.set(id,{...current,wire:structuredClone(wire)});return wire},
 }
 const a=flushWorldQueue(store,'a',{state:async()=>({revision:85,releaseVersion:1}),send:async wire=>{sent.push(wire);releaseSecond();throw{status:503,message:'lost acknowledgement'}}})
 const b=flushWorldQueue(store,'a',{state:async()=>({revision:85,releaseVersion:1}),send:async wire=>{sent.push(wire);return{revision:86,releaseVersion:1}}})
 await Promise.all([a,b]);assert.equal(sent.length,2);assert.equal(sent[0].actionId,sent[1].actionId,'stale tab must replay the original uncertain wire, never mint another action')
 assert.deepEqual(sent[0].payload,{rice:6});assert.deepEqual(sent[1].payload,{rice:6})
})
