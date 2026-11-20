import test from 'node:test'
import assert from 'node:assert/strict'
import {readMemorialCheckpoint,reconcileMemorial} from '../src/features/living-world/memorialExperience.ts'

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
