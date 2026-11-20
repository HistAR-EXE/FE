import test from 'node:test'
import assert from 'node:assert/strict'
import {readNavigation} from '../src/features/living-world/worldContinuity.ts'
import * as core from '../src/features/living-world/coreProofs.ts'
test('guest cache rejects malformed or unknown activities rather than crashing initialization',()=>{
 const nav={version:1,zone:'L1-C',position:[0,1],heading:0,rice:0,last:null}
 let value;globalThis.sessionStorage={getItem:()=>JSON.stringify(value)}
 for(const activities of ['invalid',{},[17],['UNKNOWN']]){value={...nav,activities};assert.equal(readNavigation('guest'),null)}
 value={...nav,activities:['A02_PREPARE']};assert.deepEqual(readNavigation('guest').activities,['A02_PREPARE'])
 value=nav;assert.ok(readNavigation('guest'))
})
test('activity presentation removes rejected optimism and keeps only confirmed plus valid pending sequence',()=>{
 const row=(id,status='PENDING',createdAt=1)=>({status,createdAt,intent:{actionType:'COMPLETE_ACTIVITY',targetId:id,payload:{}}})
 assert.deepEqual(core.reconcileRoomActivities([], [row('A02_PREPARE','REJECTED_REQUIRES_ACTION')]),[])
 assert.deepEqual(core.reconcileRoomActivities(['A02_PREPARE'],[row('A02_SMOKE','REJECTED_REQUIRES_ACTION')]),['A02_PREPARE'])
 assert.deepEqual(core.reconcileRoomActivities([], [row('A02_SMOKE','PENDING',2),row('A02_PREPARE','PENDING',1)]),['A02_PREPARE','A02_SMOKE'])
 assert.deepEqual(core.reconcileRoomActivities([], [row('A02_SMOKE')]),[])
})
