import test from 'node:test'
import assert from 'node:assert/strict'
import {reconcileKitchenEcho} from '../src/features/living-world/kitchenEcho.ts'
test('echo resume uses only the known presentation checkpoint and excludes rejected optimism',()=>{
 const row={status:'PENDING',intent:{actionType:'SAVE_CHECKPOINT',targetId:'L1-C',payload:{kitchenEcho:true}}}
 assert.equal(reconcileKitchenEcho(false,[row]),true)
 assert.equal(reconcileKitchenEcho(false,[{...row,status:'WAITING_DEPENDENCY'}]),true)
 assert.equal(reconcileKitchenEcho(false,[{...row,status:'REJECTED_REQUIRES_ACTION'}]),false)
 assert.equal(reconcileKitchenEcho(true,[]),true)
 assert.equal(reconcileKitchenEcho('true',[]),false)
 assert.equal(reconcileKitchenEcho(false,[{...row,intent:{...row.intent,targetId:'S5'}}]),false)
})
