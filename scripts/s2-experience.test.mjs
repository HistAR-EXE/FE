import test from 'node:test'
import assert from 'node:assert/strict'
import {planPath} from '../src/features/living-world/worldModel.ts'
test('S2 has explorable routes beyond the G2 tabletop without crossing the work shelter',()=>{
 const route=planPath([0,2],[5,4],'S2');assert.ok(route.length>5)
 for(const [x,z] of route)assert.ok(!(x < -2.5 && z < -1.5))
 assert.deepEqual(planPath([0,2],[0,-.7],'S2'),[])
})
test('A04 requires grip, lift, release; leaving resets pose without awarding a stroke',async()=>{
 const {stepA04}=await import('../src/features/living-world/a04Experience.ts')
 assert.equal(stepA04('IDLE','RELEASE').stroke,false)
 assert.equal(stepA04('READY','GRIP').phase,'HELD')
 assert.equal(stepA04('HELD','LIFT').phase,'RAISED')
 assert.equal(stepA04('RAISED','RELEASE').stroke,true)
 assert.deepEqual(stepA04('RAISED','LEAVE'),{phase:'IDLE',stroke:false})
})
