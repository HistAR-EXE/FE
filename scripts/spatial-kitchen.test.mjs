import test from 'node:test'
import assert from 'node:assert/strict'
import {selectSmokeNode,kitchenNodes} from '../src/features/living-world/spatialKitchen.ts'
import {zones,isSafeWorldPoint,planPath} from '../src/features/living-world/worldModel.ts'

test('smoke selection rejects reversed or skipped nodes and resumes a valid prefix',()=>{
 assert.equal(selectSmokeNode([],'DIFFUSION').result,'WRONG')
 assert.deepEqual(selectSmokeNode(['HEARTH'],'DIFFUSION').path,[])
 assert.equal(selectSmokeNode(['HEARTH','CHANNEL'],'DIFFUSION').result,'COMPLETE')
 assert.equal(selectSmokeNode([],'WATER').result,'INVALID')
 assert.deepEqual(selectSmokeNode(['HEARTH','CHANNEL','DIFFUSION'],'HEARTH').path,['HEARTH'])
})
test('every physical Q4 object has a reachable shared observation position',()=>{
 for(const n of kitchenNodes){const target=zones['L1-C'].targets.find(t=>t.id==='Q4_'+n.id);assert.ok(target);assert.ok(isSafeWorldPoint(target.approach,'L1-C'));assert.ok(planPath([0,2.5],target.approach,'L1-C').length)}
})
