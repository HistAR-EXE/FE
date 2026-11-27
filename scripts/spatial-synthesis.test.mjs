import test from 'node:test'
import assert from 'node:assert/strict'
import {connectSynthesis} from '../src/features/living-world/spatialSynthesis.ts'
import {zones,isSafeWorldPoint,planPath} from '../src/features/living-world/worldModel.ts'
import {routesFrom} from '../src/features/living-world/worldContinuity.ts'
test('spatial synthesis validates explicit relations without promoting WATER or MEDICAL to foundations',()=>{
 assert.equal(connectSynthesis('ENTRANCE','AIR'),null)
 assert.equal(connectSynthesis('ENTRANCE','STRUCTURE'),'ENTRANCE_STRUCTURE_ORGANIZES_SPACE')
 assert.equal(connectSynthesis('AIR','LIVING'),'AIR_SUPPORTS_LIVING_CONDITIONS')
 assert.equal(connectSynthesis('SUPPORT','COMMUNITY'),'KITCHEN_WATER_MEDICAL_SUPPORT_COMMUNITY')
})
test('L2-D and L3-D are independently enterable rooms with safe model approach and return edges',()=>{
 for(const z of ['L2-D','L3-D']){
  assert.ok(zones[z]);assert.ok(isSafeWorldPoint([0,2],z));assert.ok(planPath([0,2],[0,.5],z).length)
  assert.ok(routesFrom(z).some(r=>r.passage));assert.ok(routesFrom(z).some(r=>r.type==='FAST_RETURN'))
 }
 assert.ok(zones['L3-D'].targets.some(t=>t.id==='SYN_ENTRANCE'))
 assert.ok(!zones['L3-A'].targets.some(t=>t.id.startsWith('SYN_')))
})
