import test from 'node:test'
import assert from 'node:assert/strict'
import {passages,passagePoints,passageFloor,insidePassage} from '../src/features/living-world/undergroundContinuity.ts'
test('representative passage pairs are reversible authored walking routes, never knowledge links',()=>{
 for(const p of Object.values(passages)){
  const reverse=passages[p.reverse];assert.ok(reverse,p.id);assert.equal(reverse.reverse,p.id);assert.equal(reverse.from,p.to);assert.equal(reverse.to,p.from)
  assert.equal(p.truth,'THEMATIC_SCENE');assert.ok(['crawl','down','up'].includes(p.motion))
  const points=passagePoints(p);assert.ok(points.length>=4);assert.ok(points.some(v=>v[1]!==0)||p.motion==='crawl')
 }
})
test('passage floors and camera volume follow the bent ramp, with no imaginary flat floor over the descent',()=>{
 for(const p of Object.values(passages).filter(p=>p.from!=='S1'))for(const [x,y,z] of passagePoints(p)){
  assert.ok(Math.abs(passageFloor(p.from,x,z)-y)<.08,p.id)
  assert.ok(insidePassage(p.from,x,y+.7,z),p.id)
  assert.equal(insidePassage(p.from,x,y+2,z),false,p.id)
 }
})

test('arrival leaves each doorway on the safe existing walk grid and connects every next route',async()=>{
 const {passageArrival}=await import('../src/features/living-world/undergroundContinuity.ts')
 const {isSafeWorldPoint,planPath}=await import('../src/features/living-world/worldModel.ts')
 for(const p of Object.values(passages)){
  const a=passageArrival(p.id);assert.ok(isSafeWorldPoint(a.position,p.to),p.id+' arrival')
  for(const next of Object.values(passages).filter(q=>q.from===p.to))
   assert.ok(planPath(a.position,next.at,p.to).length||Math.hypot(a.position[0]-next.at[0],a.position[1]-next.at[1])<.1,p.id+' → '+next.id)
 }
})
