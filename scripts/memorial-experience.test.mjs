import test from 'node:test'
import assert from 'node:assert/strict'
import {readMemorialCheckpoint,reconcileMemorial,reconcileEpilogue,describeMemorialContext} from '../src/features/living-world/memorialExperience.ts'

test('memorial validates choices without inventing completion for skipping',()=>{
 assert.equal(readMemorialCheckpoint({choice:'SKIP',phase:'OFFERED'}),null)
 assert.equal(readMemorialCheckpoint({choice:'QUIET',phase:'OFFERED'}),null)
 assert.equal(readMemorialCheckpoint({choice:'FLOWERS',phase:'UNKNOWN'}),null)
 assert.deepEqual(readMemorialCheckpoint({choice:'SKIP',phase:'LEFT',points:99}),{choice:'SKIP',phase:'LEFT'})
})

test('pending memorial resumes in queue order and rejected optimism is removed',()=>{
 const confirmed={choice:'FLOWERS',phase:'SELECTED'}
 const row=(createdAt,status,phase)=>({id:String(createdAt),owner:'qa',createdAt,status,intent:{actionType:'SAVE_CHECKPOINT',targetId:'S5',payload:{memorial:{choice:'FLOWERS',phase}}}})
 assert.deepEqual(reconcileMemorial(confirmed,[row(2,'PENDING','REFLECTING'),row(1,'PENDING','OFFERED')]),{choice:'FLOWERS',phase:'REFLECTING'})
 assert.deepEqual(reconcileMemorial(confirmed,[row(1,'REJECTED_REQUIRES_ACTION','OFFERED')]),confirmed)
 assert.deepEqual(reconcileMemorial(confirmed,[{...row(1,'PENDING','OFFERED'),intent:{actionType:'SAVE_CHECKPOINT',targetId:'S0',payload:{}}}]),confirmed)
})

test('epilogue return state reconciles durable checkpoint and rejects unauthorized epilogue optimism',()=>{
 const row=(status,epilogue='RETURNED',targetId='S5')=>({id:'1',owner:'qa',createdAt:1,status,intent:{actionType:'SAVE_CHECKPOINT',targetId,payload:{epilogue}}})
 assert.equal(reconcileEpilogue('RETURNED',[]),true)
 assert.equal(reconcileEpilogue(undefined,[row('PENDING')]),true)
 assert.equal(reconcileEpilogue(undefined,[row('REJECTED_REQUIRES_ACTION')]),false)
 assert.equal(reconcileEpilogue(undefined,[row('PENDING','RETURNED','S0')]),false)
})

test('memorial context distinguishes independent visit from post-synthesis epilogue and maps offering targets',()=>{
 const standalone=describeMemorialContext(null,false,false)
 assert.equal(standalone.isEpilogue,false)
 assert.equal(standalone.targetForChoice,null)

 const epilogueFlowers=describeMemorialContext({choice:'FLOWERS',phase:'SELECTED'},true,true)
 assert.equal(epilogueFlowers.isEpilogue,true)
 assert.equal(epilogueFlowers.targetForChoice,'MEMORIAL_FLOWERS')

 const offeredIncense=describeMemorialContext({choice:'INCENSE',phase:'OFFERED'},true,true)
 assert.equal(offeredIncense.targetForChoice,'MEMORIAL_INCENSE')
 assert.ok(offeredIncense.phaseOutcome.includes('hương'))
})
