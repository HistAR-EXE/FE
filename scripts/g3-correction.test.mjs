import test from 'node:test'
import assert from 'node:assert/strict'
import {worldRoutes} from '../src/features/living-world/worldContinuity.ts'
import {zones,planPath,isSafeWorldPoint} from '../src/features/living-world/worldModel.ts'
test('Baseline ¶308/400: entrance has both branches and a surface return',()=>{
 assert.ok(worldRoutes.find(r=>r.from==='S1'&&r.to==='L1-A'),'S1 must open L1-A')
 assert.ok(zones['L1-A'])
 assert.ok(!worldRoutes.some(r=>r.from==='S1'&&r.to==='L1-B'))
 for(const to of ['S1','L1-B','L1-D','S0'])assert.ok(worldRoutes.some(r=>r.from==='L1-A'&&r.to===to),to)
 for(const r of worldRoutes){assert.ok(isSafeWorldPoint(r.spawn,r.to),r.id);assert.ok(planPath([0,2],r.approach,r.from).length,r.id)}
})

test('G3 WS6: each underground layer has its own reachable layout (no shared recoloured corridor)',async()=>{
 const {tunnelLayouts}=await import('../src/features/living-world/tunnelLayouts.ts')
 const sig=new Set()
 for(const [zone,l] of Object.entries(tunnelLayouts)){
  sig.add(JSON.stringify(l.segs.slice(1)))
  for(const t of zones[zone].targets)assert.ok(isSafeWorldPoint(t.approach,zone)&&(t.approach.join()==='0,2'||planPath([0,2],t.approach,zone).length>0),zone+' '+t.id)
 }
 assert.equal(sig.size,Object.keys(tunnelLayouts).length)
 assert.ok(tunnelLayouts['L3-A'].high<tunnelLayouts['L1-B'].high,'L3 passages are lower')
 assert.ok(zones['L2-A'].targets.some(t=>t.id==='L2D_NICHE'))
})

test('G3 QA RETURN-TYPE: "Trở về hiện tại" is FAST_RETURN (not a temporal portal / Q6), five route types only',async()=>{
 const {typeLabels}=await import('../src/features/living-world/worldContinuity.ts')
 for(const r of worldRoutes.filter(r=>r.id.startsWith('RETURN_'))){assert.equal(r.type,'FAST_RETURN',r.id);assert.equal(r.to,'S0')}
 for(const r of worldRoutes)assert.ok(['PHYSICAL_VERIFIED','THEMATIC_SCENE','KNOWLEDGE_LINK','TEMPORAL_PORTAL','FAST_RETURN'].includes(r.type),r.id)
 assert.ok(!worldRoutes.some(r=>r.type==='PHYSICAL_VERIFIED'),'no route self-claims PHYSICAL_VERIFIED')
 assert.match(typeLabels.FAST_RETURN,/không phải Epilogue/)
})

test('G3 QA Q1: decoys and the hatch are reachable ground clues; decoys never count as progress; return lands beside the hatch',async()=>{
 const {isQuestTarget}=await import('../src/features/living-world/tunnelLayouts.ts')
 const {openHeading}=await import('../src/features/living-world/worldModel.ts')
 for(const id of ['Q1_TRAIL','Q1_LEAVES','Q1_HATCH','S1_DECOY_1','S1_DECOY_2']){const t=zones.S1.targets.find(t=>t.id===id);assert.ok(t,id);assert.ok(planPath([0,2],t.approach,'S1').length>0,id)}
 assert.equal(isQuestTarget('S1_DECOY_1'),false);assert.equal(isQuestTarget('Q1_HATCH'),true)
 const up=worldRoutes.find(r=>r.id==='ENTRANCE_SURFACE');assert.deepEqual(up.spawn,[2,-1.5]);assert.ok(isSafeWorldPoint(up.spawn,'S1'))
 // safe spawn view: L3-A spawn would face a wall with the default heading; the open direction is chosen instead
 const h=openHeading('L3-A',[0,2],Math.PI);assert.ok(Math.abs(Math.cos(h))<1e-6,'L3-A turns along the passage, not into the wall')
 assert.equal(openHeading('L1-B',[0,2],Math.PI),Math.PI);assert.ok(Math.abs(Math.cos(openHeading('L3-A',[0,2],0)))<1e-6,'QA fixture heading 0 (towards the entry shaft) also turns along the passage')
})

test('G3 QA QC-CAMERA: every underground spawn faces along a passage with room behind for the camera',async()=>{
 const {tunnelLayouts}=await import('../src/features/living-world/tunnelLayouts.ts')
 const {enterZone,initialShell,openHeading}=await import('../src/features/living-world/worldModel.ts')
 for(const zone of Object.keys(tunnelLayouts)){
  const s=enterZone(initialShell(),zone);assert.ok(isSafeWorldPoint(s.position,zone),zone)
  assert.equal(openHeading(zone,s.position,s.heading),s.heading,zone+' spawn heading is already the open view')
  // r16 PO contract change: authored passages arrive on the far side of their own door ("xuất hiện đúng phía bên kia"),
  // not at the layer's single spawn; they must still land on the safe walk grid at the reverse door's arrival point.
  const {passageArrival}=await import('../src/features/living-world/undergroundContinuity.ts')
  for(const r of worldRoutes.filter(r=>r.to===zone)){if(r.passage){const a=passageArrival(r.passage);assert.ok(isSafeWorldPoint(r.spawn,zone),r.id+' passage arrival safe');assert.deepEqual(r.spawn,a.position,r.id);assert.equal(r.heading,a.heading,r.id);continue}
   assert.deepEqual(r.spawn,s.position,r.id);assert.equal(r.heading,s.heading,r.id)}
 }
})

test('G3 R2 P2: only 01/1967 + the Bến Dược reference site are open; other eras locked without event claims',async()=>{
 const {P2_ERAS,P2_SITES,initialP2}=await import('../src/features/living-world/p2Data.ts')
 assert.deepEqual(P2_ERAS.filter(e=>e.open).map(e=>e.id),['1967-01'])
 for(const e of P2_ERAS.filter(e=>!e.open))assert.match(e.note,/khóa/)
 assert.deepEqual(P2_SITES.filter(s=>s.open).map(s=>s.id),['ben-duoc'])
 assert.match(P2_SITES[0].note,/không phải nơi diễn ra mọi sự kiện/)
 assert.deepEqual(initialP2(),{stage:'ERA',era:null,site:null},'no era is pre-selected: the player chooses')
})
