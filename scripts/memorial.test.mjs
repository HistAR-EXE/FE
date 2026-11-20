import test from 'node:test'
import assert from 'node:assert/strict'
import {zones,enterZone,initialShell,startApproach,advanceShell,arrivedInteraction,isSafeWorldPoint} from '../src/features/living-world/worldModel.ts'
import {routesFrom,readNavigation} from '../src/features/living-world/worldContinuity.ts'

test('modern memorial is independently reachable and all stations have accessible approaches',()=>{
 assert.ok(routesFrom('S0').some(route=>route.to==='S5'&&route.type==='THEMATIC_SCENE'))
 assert.ok(routesFrom('S5').some(route=>route.to==='S0'&&route.type==='FAST_RETURN'))
 for(const target of zones.S5.targets){
  assert.ok(isSafeWorldPoint(target.approach,'S5'),target.id)
  let shell=startApproach(enterZone(initialShell(),'S5'),target.id)
  for(let i=0;i<500&&shell.path.length;i++)shell=advanceShell(shell,.1)
  assert.equal(arrivedInteraction(shell),target.id)
 }
 assert.equal(isSafeWorldPoint([-1.5,-1.5],'S5'),false)
 assert.equal(isSafeWorldPoint([2,-1],'S5'),false)
})

test('memorial navigation resumes without requiring synthesis',()=>{
 const value={version:1,zone:'S5',position:[0,2],heading:0,rice:0,last:null,facts:[]}
 globalThis.sessionStorage={getItem:()=>JSON.stringify(value)}
 try{assert.deepEqual(readNavigation('guest'),value)}finally{delete globalThis.sessionStorage}
})
