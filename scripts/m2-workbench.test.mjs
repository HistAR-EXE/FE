import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync} from 'node:fs'
import * as T from 'three'
import {Kit} from '../src/features/time-portal/tunnel3d/kit.ts'
const file=new URL('../src/features/living-world/m2Workbench.ts',import.meta.url)
const m=existsSync(file)?await import(file.href):null
const setup=(kind='rice')=>{
 assert.ok(m,'Authored workbench controller is not implemented')
 const scene=new T.Scene(),station=new T.Group(),second=new T.Group(),g=new T.Group(),kit=new Kit()
 station.position.set(2,.1,-1);station.rotation.y=.4;second.position.set(3,.1,.5);scene.add(station,second,g)
 const actor={g,reach(v){this.shared=v},grip(l,r){this.hands=l?[l.clone(),r.clone()]:null},setIdle(v){this.clip=v},setCrouch(){},setTalking(){}}
 const motion=m.createWorkbench({actor,kit,kind,stations:[{id:'FIRST',object:station},{id:'SECOND',object:second}]})
 return {scene,station,second,g,actor,motion,kit}
}
test('visible work clock pauses without accumulating hidden, alert or reduced time',()=>{
 assert.ok(m,'Authored workbench clock is not implemented')
 const c=m.createWorkClock();assert.equal(c.advance(.5,{}),.1)
 for(const state of [{hidden:true},{paused:true},{reduced:true}])assert.equal(c.advance(50,state),.1)
 assert.ok(Math.abs(c.advance(.05,{})-.15)<1e-10)
})
test('both hands contact rendered handles in transformed station coordinates',()=>{
 const {scene,station,actor,motion,kit}=setup()
 for(let i=0;i<100;i++)motion.update(.016,{active:'FIRST'})
 scene.updateMatrixWorld(true)
 const frame=actor.g.userData.workbench
 assert.equal(frame.phase,'WORK');assert.equal(frame.target,'FIRST');assert.equal(actor.hands.length,2)
 for(let i=0;i<2;i++)assert.ok(actor.hands[i].distanceTo(motion.handles[i].getWorldPosition(new T.Vector3()))<1e-6)
 assert.equal(motion.root.parent,station);assert.ok(motion.root.children.length>0);kit.dispose()
})
test('travel releases contact until arrival at the selected bench',()=>{
 const {actor,motion,kit}=setup('sandal');motion.update(.016,{active:'FIRST'});motion.update(.016,{active:'SECOND'})
 assert.equal(actor.g.userData.workbench.phase,'TRAVEL');assert.equal(actor.hands,null)
 for(let i=0;i<300;i++)motion.update(.016,{active:'SECOND'})
 assert.equal(actor.g.userData.workbench.target,'SECOND');assert.equal(actor.g.userData.workbench.phase,'WORK');assert.equal(actor.hands.length,2);kit.dispose()
})
test('reduced motion gives an equivalent still pose without cycling',()=>{
 const {actor,motion,kit}=setup('weave');motion.update(.016,{active:'SECOND',reduced:true})
 const before=actor.hands.map(p=>p.toArray());for(let i=0;i<20;i++)motion.update(.1,{active:'SECOND',reduced:true})
 assert.deepEqual(actor.hands.map(p=>p.toArray()),before);assert.equal(actor.g.userData.workbench.phase,'STILL');kit.dispose()
})
test('conversation pauses choreography without changing completed activity input',()=>{
 const {actor,motion,kit}=setup('dig'),completed=['FIRST']
 for(let i=0;i<100;i++)motion.update(.016,{completed})
 motion.update(.016,{active:'NPC_EXCAVATOR',paused:true,completed});assert.equal(actor.hands,null)
 const clock=actor.g.userData.workbench.elapsed
 motion.update(10,{paused:true,completed});assert.equal(actor.g.userData.workbench.elapsed,clock)
 assert.deepEqual(completed,['FIRST']);kit.dispose()
})
test('every work profile has finite separate grips and allocates no meshes per frame',()=>{
 for(const kind of ['rice','sandal','weave','dig','rhythm','parcel','writing']){
  const {scene,actor,motion,kit}=setup(kind);const n=motion.root.children.length
  for(let i=0;i<300;i++)motion.update(.016,{})
  scene.updateMatrixWorld(true);assert.equal(motion.root.children.length,n)
  assert.ok(actor.hands.every(p=>p.toArray().every(Number.isFinite)),kind)
  assert.ok(actor.hands[0].distanceTo(actor.hands[1])>.04,kind);kit.dispose()
 }
})

test('left and right tool grips respect the rig facing direction instead of crossing arms',()=>{
 const {station,actor,motion,kit}=setup('rice');motion.update(.016,{reduced:true})
 const l=station.worldToLocal(actor.hands[0].clone()),r=station.worldToLocal(actor.hands[1].clone())
 assert.ok(l.x>r.x,'Rig left shoulder is on local positive X when facing the station')
 kit.dispose()
})

test('writing pencil tip stays on the held sheet throughout its stroke, including rotated stations',()=>{
 const {scene,motion,kit}=setup('writing')
 const pencil=motion.handles[1].children.find(o=>o.geometry?.type==='CylinderGeometry')
 const sheet=motion.handles[0].children.find(o=>o.geometry?.type==='BoxGeometry')
 for(let i=0;i<250;i++){
  motion.update(.016,{});scene.updateMatrixWorld(true)
  const tip=sheet.worldToLocal(pencil.localToWorld(new T.Vector3(0,-.08,0)))
  assert.ok(Math.abs(tip.x)<sheet.geometry.parameters.width/2-.005,'pencil must remain over the sheet, not write beside it')
  assert.ok(Math.abs(tip.z)<sheet.geometry.parameters.depth/2-.005)
  assert.ok(Math.abs(tip.y)<.007,'pencil tip meets the held paper plane')
 }
 kit.dispose()
})
