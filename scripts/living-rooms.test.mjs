import test from 'node:test'
import assert from 'node:assert/strict'
import {livingSpaces,livingWalkable,livingBlockers} from '../src/features/living-world/livingSpaces.ts'
import {enterZone,initialShell,planPath,arrivedInteraction,advanceShell,startApproach} from '../src/features/living-world/worldModel.ts'
import {worldRoutes} from '../src/features/living-world/worldContinuity.ts'
import {passages} from '../src/features/living-world/undergroundContinuity.ts'
const layer=z=>z.startsWith('L')?z.slice(0,2):'S'
test('G3/G4 rooms: every interaction approach is actually arrived at (path ends within the arrival radius)',()=>{
 for(const [zone,space] of Object.entries(livingSpaces))for(const t of space.targets){
  let s=startApproach({...enterZone(initialShell(),zone),position:[0,1]},t.id)
  for(let i=0;i<400&&s.path.length;i++)s=advanceShell(s,.05)
  assert.equal(arrivedInteraction(s),t.id,`${zone}/${t.id} never counts as arrived`)
  assert.ok(Math.hypot(t.at[0]-t.approach[0],t.at[1]-t.approach[1])<1.15,`${zone}/${t.id} station is out of arm's reach of its approach`)
 }
})
test('G3/G4 rooms: furniture footprints are not walkable and the entry/vestibule are',()=>{
 for(const [zone,rects] of Object.entries(livingBlockers)){for(const [x0,x1,z0,z1] of rects)assert.equal(livingWalkable([(x0+x1)/2,(z0+z1)/2],zone),false,zone)
  for(const p of [[0,2.5],[0,1],[1,3],[-1,3]])assert.ok(livingWalkable(p,zone),zone+' '+p)}
})
test('G3/G4 continuity: living rooms hang off their own layer by authored passages; no cross-layer jump between rooms',()=>{
 const rooms=Object.keys(livingSpaces)
 for(const r of worldRoutes)if((rooms.includes(r.from)||rooms.includes(r.to))&&r.from.startsWith('L')&&r.to.startsWith('L')&&r.type!=='KNOWLEDGE_LINK')assert.ok(r.passage||layer(r.from)===layer(r.to),`${r.id} jumps ${r.from}→${r.to} without a passage`)
 for(const room of ['L2-C','L3-B','L3-C'])assert.ok(Object.values(passages).some(p=>p.to===room&&layer(p.from)===layer(room)),room+' has no passage from its own layer')
 for(const p of Object.values(passages))assert.equal(p.truth,'THEMATIC_SCENE')
})
